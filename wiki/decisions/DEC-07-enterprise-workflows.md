---
id: DEC-07
title: Enterprise-grade GitHub workflows — composite setup, SHA pinning, parallel CI, CodeQL, dep-audit, release automation, fork hardening
type: decision
status: proposed
date: 2026-05-20
extends: DEC-05
supersedes: []
superseded-by: []
tags: [ci, cd, github-actions, security, supply-chain, codeql, dependabot, sha-pinning, release, codeowners, branch-protection, workflows]
related:
  - "build deploy"
  - "[[decisions/DEC-05-low-code-config]]"
  - "[[decisions/DEC-06-cloudflare-outpost]]"
---

# DEC-07 — Enterprise-grade GitHub workflows

> **Extends [[DEC-05-low-code-config]] §6 "Workflow hardening".** DEC-05 introduced the composite `_setup` action, SHA-pinning baseline, and `cancel-in-progress: true` on the Pages deploy. DEC-07 takes the next step: parallelism, supply-chain auditing, signed-commit-friendly branch protection, CodeQL scanning, release-notes automation, fork RCE hardening, and a CODEOWNERS gate. The composite action and base-path env-var from DEC-05 are *prerequisites* — this decision assumes they already exist in `.github/actions/setup/` and that `vite.config.ts` reads `PUBLIC_BASE_PATH`.

## Problem

The DEC-05 hardening is necessary but not sufficient. Concretely, the workflows that exist on `main` today (and the rewritten variants proposed in DEC-05 §6) still have these gaps when measured against an "enterprise" supply-chain posture:

1. **Setup duplication.** `ci.yml`, `deploy.yml`, `pr-preview.yml` each repeat `checkout → setup-node → npm ci`. DEC-05 introduces `_setup` to fix this, but doesn't extend the pattern to the new workflows added in DEC-07 (CodeQL, dep-audit, release). The composite must be the single setup site for *all* workflows.

2. **Not SHA-pinned.** `actions/checkout@v4`, `actions/setup-node@v4`, `peaceiris/actions-gh-pages@v4`, `rossjrw/pr-preview-action@v1` are major-tag-pinned. A compromised tag can be silently re-pointed to a malicious commit (cf. tj-actions/changed-files supply-chain incident, March 2025). Every `uses:` must be a 40-char commit SHA with the version tag in a comment.

3. **No parallelism in CI.** Today's `ci.yml` chains `test → build` sequentially. With the rewrite, `lint`, `typecheck`, `test`, `build` are logically independent (they only share `npm ci` cost). Running them in parallel on free-tier `ubuntu-latest` runners cuts wall-clock CI from ~4 min to ~1.5 min.

4. **No CodeQL.** The repo has zero static security analysis. CodeQL is free for public repos and catches TypeScript injection / prototype-pollution patterns that `tsc --noEmit` cannot see.

5. **No dependency auditing.** `npm audit` is never run. Even at zero runtime deps, the 89-package dev-tree (Vite + Vitest + transitive) is a vector. A daily scheduled `npm audit --omit=dev --audit-level=high` (and weekly `--include=dev`) closes the gap.

6. **No release-notes automation.** Pushes to `main` deploy but produce no GitHub Release. Version drift (already noted in build deploy) is compounded by lack of human-readable release history. `release-drafter/release-drafter` reads PR labels to auto-generate notes.

7. **Forks can trigger preview deploys.** `pull_request` (not `pull_request_target`) fires for forks too. Today's `pr-preview.yml` runs the fork's code with write permissions to `gh-pages` — a fork PR that adds a malicious npm script in `npm ci`'s lifecycle hooks (`postinstall`) gets RCE on the runner with `contents: write`. The mitigation is well-known: only run preview for *same-repo* PRs OR require a maintainer label (`safe-preview`) for fork PRs.

8. **No CODEOWNERS gate.** Anything touching `.github/`, `worker/`, `vite.config.ts`, `src/config/` should require user review. Today, an attacker with merge access to *any* path has access to *all* paths.

9. **Branch protection is documented nowhere.** Required status checks, linear history, signed commits — all settable in the GitHub UI but nothing in the repo signals what *should* be required.

10. **`deploy.yml` still does redundant typecheck/test.** With DEC-07's gating, deploy *requires* a green CI run on the same SHA — no need to re-run `tsc --noEmit` and `vitest run` inside `deploy.yml`. Download the build artefact from CI instead.

11. **Dependabot is absent.** SHA-pinning (problem 2) creates upgrade churn. Without Dependabot, pinned actions go stale; with Dependabot grouping by major version, the churn batches into one PR per ecosystem per week.

12. **`workflow_dispatch` on deploy bypasses CI.** Today, anyone with write access can dispatch a deploy from a red branch. The fix is to gate `deploy.yml` on the latest `ci.yml` run for the same SHA being successful (via `workflow_run` trigger or an explicit `needs:` chain across workflows using `actions/github-script` to query the API).

See build deploy for the current state of these workflows and [[decisions/DEC-05-low-code-config]] §6 for what's already been proposed.

## Constraints

- **Zero runtime cost.** Everything runs on GitHub Actions free tier for public repos. No paid runners, no self-hosted, no Codecov/Snyk/etc. CodeQL is free for public; release-drafter is free; Dependabot is free.
- **Reproducible.** Every pinned action is auditable by SHA. Every workflow can be re-run on the same SHA and produce the same artefact (modulo non-determinism in upstream actions, which is why we pin).
- **Auditable.** Every workflow trigger and outcome is visible in the Actions tab. CODEOWNERS makes review required on sensitive paths. Branch protection enforces signed commits.
- **Signed commits where possible.** The user has GPG/SSH commit signing configured locally. Branch protection should *require* signed commits on `main`; PRs from forks may use unsigned commits (squash-merge will re-sign).
- **No AI attribution in commits/PRs/comments.** Per user memory rule and CLAUDE.md. The release-drafter config must not inject "Generated with Claude Code" or any Co-Authored-By: line for AI actors. Manual `Co-Authored-By:` for human collaborators is fine.
- **Solo-developer-friendly.** Required reviewers must not block the user from merging their own PRs. GitHub allows "allow specified actors to bypass required pull requests" and "allow self-review" via the rulesets API — both are used.
- **Same toolchain.** Node 22 stays canonical. Node 24 LTS is added only as a *matrix* dimension on the build job to catch forward-compat issues, not as the deploy runtime.
- **Backwards-compatible with DEC-05.** The `_setup` composite from DEC-05 is reused verbatim. The `PUBLIC_BASE_PATH` env-var contract from DEC-05 is preserved.
- **Backwards-compatible with [[DEC-06-cloudflare-outpost]].** The PR-preview path under the Worker is `/pr/<n>/`, not `/pr-preview/pr-<n>/`. DEC-07's `pr-preview.yml` writes to the path expected by DEC-06.

## Decision

Introduce a layered, gated, supply-chain-hardened workflow architecture. Six workflows + one composite action + one CODEOWNERS + one Dependabot config + documented branch protection rules.

### Architecture overview

```
                       ┌────────────────────────────┐
on: push (any branch)  │   ci.yml                   │
on: pull_request       │   ┌──────┐  ┌──────────┐   │
                       │   │ lint │  │ typecheck│   │
                       │   └──┬───┘  └────┬─────┘   │  parallel
                       │      │           │         │  (all four
                       │   ┌──┴───┐  ┌────┴─────┐   │   depend
                       │   │ test │  │ build    │   │   only on
                       │   └──────┘  │ (matrix  │   │   _setup)
                       │             │  22, 24) │   │
                       │             └──────────┘   │
                       └────────────┬───────────────┘
                                    │  on success
                       ┌────────────┴───────────────┐
on: workflow_run       │   deploy.yml               │
  (ci.yml completed,   │   - env: production        │
   conclusion success, │   - required reviewer (self│
   branch=main)        │     -approval allowed)     │
                       │   - downloads CI artefact  │
                       │   - peaceiris gh-pages     │
                       └────────────┬───────────────┘
                                    │
                       ┌────────────┴───────────────┐
on: push: main         │   release.yml              │
                       │   - read src/config/       │
                       │     version.ts             │
                       │   - release-drafter v6     │
                       └────────────────────────────┘

on: pull_request       ┌────────────────────────────┐
  (same-repo OR        │   pr-preview.yml           │
   label=safe-preview) │   - writes /pr/<n>/        │
                       │   - DEC-06 Worker serves   │
                       └────────────────────────────┘

on: schedule (weekly)  ┌────────────────────────────┐
                       │   codeql.yml               │
                       └────────────────────────────┘

on: schedule (daily)   ┌────────────────────────────┐
                       │   dep-audit.yml            │
                       │   - opens issue on failure │
                       └────────────────────────────┘
```

### 1. Composite action: `.github/actions/setup/action.yml`

Per DEC-05 §6, but extended here to also expose `node-version` as an input so the `build` matrix can override it.

```yaml
# .github/actions/setup/action.yml
name: Setup Node + Install
description: Checkout-aware setup. Sets up Node, restores npm cache, runs npm ci.
inputs:
  node-version:
    description: Node major version to install.
    required: false
    default: '22'
runs:
  using: composite
  steps:
    - name: Setup Node.js
      uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
      with:
        node-version: ${{ inputs.node-version }}
        cache: npm
    - name: Install dependencies
      shell: bash
      run: npm ci --no-audit --no-fund
```

Notes:
- `actions/setup-node` SHA above is for v4.0.2. Pin to the actual current SHA at apply time; the comment keeps the version tag human-readable.
- `--no-audit --no-fund` shaves ~3 s off every `npm ci` and is safe because we run a dedicated audit workflow daily (see §4).
- Composite actions cannot do `actions/checkout` themselves — checkout must run *before* the composite so the action file is on disk. Each workflow does `actions/checkout@<SHA>` inline, then `uses: ./.github/actions/setup`.

### 2. `.github/workflows/ci.yml` — parallel four-job CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./.github/actions/setup
      - name: Run lint
        run: npx tsc --noEmit  # tsc-as-linter, per DEC-05 constraint of no new dev deps

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./.github/actions/setup
      - name: Type check
        run: npx tsc --noEmit --pretty false

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./.github/actions/setup
      - name: Run tests
        run: npm test -- --reporter=verbose

  build:
    name: Build (Node ${{ matrix.node }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node: ['22', '24']
    env:
      PUBLIC_BASE_PATH: /skyline-scroller/
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./.github/actions/setup
        with:
          node-version: ${{ matrix.node }}
      - name: Build
        run: npm run build
      - name: Upload build artefact
        if: matrix.node == '22'
        uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08 # v4.6.0
        with:
          name: dist-${{ github.sha }}
          path: dist
          retention-days: 7
          if-no-files-found: error
```

Design notes:
- **`lint` and `typecheck` are separate** even though both run `tsc --noEmit`. This is a forward-compat hedge: when `oxlint` (or similar) is introduced, `lint` becomes `oxlint .` and the dual-job structure already exists. For now, the second job is a "free" redundant check that makes branch-protection cleaner (separate status checks).
- **`test` and `build` run in parallel** with `lint`. The DAG is flat — all four jobs only depend on the composite. This trades a few seconds of `npm ci` overhead per job for parallelism. Each job runs on a fresh runner.
- **Matrix on `build`**: Node 22 (production) and Node 24 LTS (forward-compat). `fail-fast: false` so a Node 24 break doesn't mask Node 22 success. Only Node 22's artefact is uploaded; Node 24 build is a sanity check only.
- **`if-no-files-found: error`** on the artefact upload: catches the case where `dist/` is empty (build silently produced nothing).
- **`permissions: contents: read`** at the workflow level — least privilege. No job needs more.
- **`concurrency: ci-${{ github.workflow }}-${{ github.ref }}`** with `cancel-in-progress: true`: pushing twice to the same PR cancels the in-flight CI run. Per the acceptance criterion "every push to a PR triggers exactly one CI run".

### 3. `.github/workflows/codeql.yml` — weekly static analysis

```yaml
# .github/workflows/codeql.yml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '17 9 * * 1'  # Mondays 09:17 UTC — off-peak, deterministic minute

permissions:
  contents: read
  security-events: write
  actions: read

concurrency:
  group: codeql-${{ github.ref }}
  cancel-in-progress: true

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        language: [javascript-typescript]
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - name: Initialize CodeQL
        uses: github/codeql-action/init@b6a472f63d85b9c78a3ac5e89422239fc15e9b3c # v3.28.5
        with:
          languages: ${{ matrix.language }}
          queries: security-extended,security-and-quality
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@b6a472f63d85b9c78a3ac5e89422239fc15e9b3c # v3.28.5
        with:
          category: "/language:${{ matrix.language }}"
```

Notes:
- `javascript-typescript` is the unified language pack in CodeQL v3+ (was two separate packs in v2).
- Runs on PRs *and* weekly schedule. PR runs catch new code; weekly run catches CVE-driven query updates against the existing codebase.
- `security-extended,security-and-quality` query suites are the recommended "thorough" pair for application code.

### 4. `.github/workflows/dep-audit.yml` — daily supply-chain audit

```yaml
# .github/workflows/dep-audit.yml
name: Dependency Audit

on:
  schedule:
    - cron: '23 4 * * *'  # Daily 04:23 UTC
  workflow_dispatch:

permissions:
  contents: read
  issues: write

jobs:
  audit:
    name: npm audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: ./.github/actions/setup

      - name: Audit production deps (high+)
        id: audit-prod
        run: npm audit --omit=dev --audit-level=high

      - name: Audit dev deps (high+)
        id: audit-dev
        if: success() || failure()
        run: npm audit --include=dev --audit-level=high

      - name: Compose issue body on failure
        if: failure()
        run: |
          {
            echo "## npm audit failure — $(date -u +%Y-%m-%dT%H:%M:%SZ)"
            echo ""
            echo "Run: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
            echo ""
            echo "### Production audit"
            echo '```'
            npm audit --omit=dev --json || true
            echo '```'
            echo ""
            echo "### Dev audit"
            echo '```'
            npm audit --include=dev --json || true
            echo '```'
          } > audit-report.md

      - name: Open issue on failure
        if: failure()
        uses: peter-evans/create-issue-from-file@e8ef132d6df98ed982188e460ebb3b5d4ef3a9cd # v5.0.0
        with:
          title: "npm audit: high-severity advisory detected ($(date -u +%Y-%m-%d))"
          content-filepath: audit-report.md
          labels: |
            security
            dependencies
            automated
```

Notes:
- `npm audit --omit=dev` covers what actually ships (currently empty `dependencies` block — but if any production dep is added, it's audited the next morning).
- `npm audit --include=dev` covers Vite, Vitest, transitive. `if: success() || failure()` ensures the dev audit still runs even if production audit failed (we want full coverage in the issue).
- `peter-evans/create-issue-from-file@v5` SHA-pinned; opens one issue per failing run. Combined with the `automated` label, a future `wiki-lint`-style cron can close stale ones.
- `issues: write` permission is the only write needed — least privilege.

### 5. `.github/workflows/deploy.yml` — gated production deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  actions: read

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  deploy:
    name: Deploy
    if: >-
      github.event_name == 'workflow_dispatch' ||
      (github.event.workflow_run.conclusion == 'success' &&
       github.event.workflow_run.head_branch == 'main')
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://${{ github.repository_owner }}.github.io/${{ github.event.repository.name }}/
    env:
      PUBLIC_BASE_PATH: /skyline-scroller/
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
        with:
          ref: ${{ github.event.workflow_run.head_sha || github.sha }}

      - name: Download CI build artefact
        if: github.event_name == 'workflow_run'
        uses: actions/download-artifact@fa0a91b85d4f404e444e00e005971372dc801d16 # v4.1.8
        with:
          name: dist-${{ github.event.workflow_run.head_sha }}
          path: dist
          github-token: ${{ secrets.GITHUB_TOKEN }}
          run-id: ${{ github.event.workflow_run.id }}

      - name: Rebuild on manual dispatch
        if: github.event_name == 'workflow_dispatch'
        run: |
          npm ci --no-audit --no-fund
          npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@4f9cc6602d3f66b9c108549d475ec49e8ef4d45e # v4.0.0
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          keep_files: true
          commit_message: "deploy: ${{ github.event.workflow_run.head_sha || github.sha }}"
```

Notes:
- **`workflow_run` trigger**: deploy only fires when CI completes successfully on `main`. The `if:` guard double-checks conclusion. This replaces the previous "deploy and re-run tests" pattern — deploy *trusts* CI now, and downloads the exact artefact CI built. One source of truth for the bundle.
- **`environment: production`**: GitHub environment with required reviewer configured in the UI (see Branch protection §10). The user is the only reviewer and can self-approve (GitHub setting "Prevent self-review" left unchecked). The environment URL is rendered in the deployments tab and on PRs.
- **`cancel-in-progress: true`**: per DEC-05's flip from `false`. Latest `main` wins.
- **`workflow_dispatch` rebuilds from source** rather than downloading an artefact (because manual dispatch may target a SHA that has no completed CI run). The dispatch path is the only one that re-runs `npm ci` and `npm run build` in this workflow.
- **`commit_message`**: stamps the deploy commit on `gh-pages` with the source SHA, making `git log gh-pages` auditable.

### 6. `.github/workflows/pr-preview.yml` — fork-safe preview

```yaml
# .github/workflows/pr-preview.yml
name: PR Preview

on:
  pull_request:
    types: [opened, synchronize, reopened, closed, labeled]

concurrency:
  group: pr-preview-${{ github.event.pull_request.number }}
  cancel-in-progress: true

permissions:
  contents: write
  pull-requests: write

jobs:
  guard:
    name: Authorize preview
    runs-on: ubuntu-latest
    outputs:
      allowed: ${{ steps.check.outputs.allowed }}
    steps:
      - id: check
        env:
          IS_FORK: ${{ github.event.pull_request.head.repo.fork }}
          HAS_LABEL: ${{ contains(github.event.pull_request.labels.*.name, 'safe-preview') }}
        run: |
          if [ "$IS_FORK" = "false" ] || [ "$HAS_LABEL" = "true" ]; then
            echo "allowed=true" >> "$GITHUB_OUTPUT"
          else
            echo "allowed=false" >> "$GITHUB_OUTPUT"
            echo "::warning::Fork PR without 'safe-preview' label — skipping preview deploy."
          fi

  preview:
    name: Build and deploy preview
    needs: guard
    if: needs.guard.outputs.allowed == 'true' && github.event.action != 'closed'
    runs-on: ubuntu-latest
    env:
      # DEC-06 Worker serves preview under /pr/<n>/, not /pr-preview/pr-<n>/.
      PUBLIC_BASE_PATH: /pr/${{ github.event.pull_request.number }}/
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - uses: ./.github/actions/setup
      - name: Run tests
        run: npm test
      - name: Build preview
        run: npm run build
      - name: Deploy PR Preview
        uses: rossjrw/pr-preview-action@f31d5aa7b364955ea86228b9dcd346dc3f29c408 # v1.4.7
        with:
          source-dir: ./dist
          preview-branch: gh-pages
          umbrella-dir: pr
          action: deploy

  cleanup:
    name: Tear down preview
    needs: guard
    if: needs.guard.outputs.allowed == 'true' && github.event.action == 'closed'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: rossjrw/pr-preview-action@f31d5aa7b364955ea86228b9dcd346dc3f29c408 # v1.4.7
        with:
          source-dir: ./dist
          preview-branch: gh-pages
          umbrella-dir: pr
          action: remove
```

Notes:
- **Guard job** is the security-critical piece. `github.event.pull_request.head.repo.fork` is `true` for fork PRs, `false` for same-repo branches. If forked and unlabelled, the build/deploy jobs are skipped entirely. Adding the `safe-preview` label triggers a re-run (via `labeled` event type).
- **`PUBLIC_BASE_PATH: /pr/${{ ... }}/`** matches [[DEC-06-cloudflare-outpost]]'s Worker routing. The umbrella directory on `gh-pages` is `pr/`, not `pr-preview/pr-N/`. Consumers of the Worker hit `/pr/<n>/index.html`.
- **`umbrella-dir: pr`** on `rossjrw/pr-preview-action` matches the path.
- **`cleanup` job** runs on PR close (merged or abandoned), removing the preview directory from `gh-pages` so stale URLs 404 cleanly.
- **`actions/checkout` with `ref: head.sha`** pins the checkout to the exact commit being tested, preventing race conditions if the PR is updated mid-run.

### 7. `.github/workflows/release.yml` — auto-drafted releases

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: write
  pull-requests: read

concurrency:
  group: release-${{ github.ref }}
  cancel-in-progress: false  # never cancel a half-drafted release

jobs:
  draft:
    name: Draft release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
        with:
          fetch-depth: 0  # release-drafter needs full history to enumerate PRs

      - name: Read version from src/config/version.ts
        id: version
        run: |
          VERSION=$(node -e "const fs=require('fs');const m=fs.readFileSync('src/config/version.ts','utf8').match(/['\"]([^'\"]+)['\"]/);if(!m)process.exit(1);process.stdout.write(m[1]);" || true)
          if [ -z "$VERSION" ]; then
            # fallback: read from package.json (DEC-05 says package.json is canonical)
            VERSION=$(node -p "require('./package.json').version")
          fi
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"
          echo "tag=v$VERSION" >> "$GITHUB_OUTPUT"

      - name: Run release-drafter
        uses: release-drafter/release-drafter@b1476f6e6eb133afa41ed8589daba6dc69b4d3f5 # v6.0.0
        with:
          config-name: release-drafter.yml
          tag: ${{ steps.version.outputs.tag }}
          name: ${{ steps.version.outputs.tag }}
          version: ${{ steps.version.outputs.version }}
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Companion config at `.github/release-drafter.yml`:

```yaml
# .github/release-drafter.yml
name-template: 'v$RESOLVED_VERSION'
tag-template: 'v$RESOLVED_VERSION'
template: |
  ## Changes

  $CHANGES

  ---
  Full changelog: $PREVIOUS_TAG...v$RESOLVED_VERSION

categories:
  - title: 'Features'
    labels: [feature, enhancement]
  - title: 'Fixes'
    labels: [fix, bug]
  - title: 'Performance'
    labels: [perf, performance]
  - title: 'Refactors'
    labels: [refactor]
  - title: 'Docs and wiki'
    labels: [docs, wiki]
  - title: 'CI / build'
    labels: [ci, build, ops]
  - title: 'Dependencies'
    labels: [dependencies]
    collapse-after: 5

change-template: '- $TITLE (#$NUMBER) @$AUTHOR'
change-title-escapes: '\<*_&'

# No AI attribution per user memory rule:
# - $AUTHOR resolves to the human committer login; release-drafter does not
#   inject co-authored-by trailers.
# - Do NOT add an "AI assistance" category or any line referencing Claude
#   Copilot, etc.
exclude-labels:
  - skip-release-notes

version-resolver:
  major:
    labels: [major, breaking]
  minor:
    labels: [minor, feature]
  patch:
    labels: [patch, fix, bug, chore]
  default: patch

autolabeler:
  - label: ci
    files: ['.github/**']
  - label: docs
    files: ['wiki/**', '**/*.md']
  - label: feature
    title: ['/^feat(\\(.*\\))?:/i']
  - label: fix
    title: ['/^fix(\\(.*\\))?:/i']
  - label: refactor
    title: ['/^refactor(\\(.*\\))?:/i']
  - label: perf
    title: ['/^perf(\\(.*\\))?:/i']
```

Notes:
- **Draft, not publish**: release-drafter creates/updates a *draft* release on every push to `main`. The user reviews and clicks "Publish" manually when ready to cut a tag.
- **Version source**: prefers `src/config/version.ts` (per DEC-05); falls back to `package.json`. Both should equal each other (DEC-05's `define` injects from `package.json`).
- **No AI attribution**: the config comments make this explicit. `$AUTHOR` is the GitHub login of the human committer.

### 8. CODEOWNERS — review gate

```text
# .github/CODEOWNERS
# Order matters: later patterns override earlier ones.
# Lines starting with # are comments.

# Default owner for everything.
*                       @fszalaj

# Sensitive paths — must not be changed without explicit user review.
/.github/               @fszalaj
/.github/workflows/     @fszalaj
/.github/actions/       @fszalaj
/.github/CODEOWNERS     @fszalaj
/worker/                @fszalaj
/vite.config.ts         @fszalaj
/src/config/            @fszalaj
/wiki/decisions/        @fszalaj

# Wiki content can be edited by anyone with merge access (relaxes default for
# non-decision wiki content if collaborators are added later). Currently the
# user is the only collaborator, so this line is a no-op — kept for forward
# compat.
# /wiki/*                @fszalaj
```

Notes:
- Replace `@fszalaj` with the actual GitHub login if different. CODEOWNERS uses GitHub usernames, not emails.
- The branch protection rule (§10) toggles "Require review from Code Owners" — without this toggle, CODEOWNERS is informational only.
- For a solo developer, CODEOWNERS combined with "allow specified actors to bypass required pull requests" (the user as bypass actor) means the user can self-merge after self-review.

### 9. `.github/dependabot.yml` — grouped weekly updates

```yaml
# .github/dependabot.yml
version: 2

updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '08:00'
      timezone: Europe/Warsaw
    open-pull-requests-limit: 5
    labels:
      - dependencies
      - npm
    commit-message:
      prefix: 'deps'
      prefix-development: 'deps-dev'
      include: scope
    groups:
      vite-ecosystem:
        patterns: ['vite', 'vitest', '@vitest/*', 'rollup', 'esbuild']
        update-types: [minor, patch]
      typescript:
        patterns: ['typescript', '@types/*']
        update-types: [minor, patch]
      production-major:
        applies-to: version-updates
        patterns: ['*']
        update-types: [major]

  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
      day: monday
      time: '08:30'
      timezone: Europe/Warsaw
    open-pull-requests-limit: 5
    labels:
      - dependencies
      - github-actions
    commit-message:
      prefix: 'ci'
      include: scope
    groups:
      actions-minor-patch:
        patterns: ['*']
        update-types: [minor, patch]
      actions-major:
        patterns: ['*']
        update-types: [major]
```

Notes:
- **`github-actions` ecosystem at `directory: /`** — Dependabot scans `.github/workflows/*.yml` AND the composite action at `.github/actions/setup/action.yml`. Both get SHA-pin bumps.
- **Grouping by update type** means: one weekly PR for all minor/patch action bumps, and a separate PR per major action bump (so major changes get individual review).
- **`commit-message.prefix: deps` / `ci`** matches conventional-commits, feeding release-drafter's autolabeler.
- **`timezone: Europe/Warsaw`** matches the user's locale (08:00 local Monday is a reasonable "first thing Monday" PR).

### 10. Branch protection — documented rules (apply via UI or `gh` CLI)

These are *not* checked-in YAML (GitHub has no canonical declarative format for branch protection; rulesets API is JSON but tied to repo IDs). Document them here so they're recoverable.

**Ruleset name**: `main-protection`
**Target**: branch `main`

Required:
- **Restrict pushes**: only via PR.
- **Require a pull request before merging**: yes.
  - Required approvals: 1.
  - Dismiss stale approvals on new commits: yes.
  - Require review from Code Owners: yes.
  - Allow specified actors to bypass required pull requests: `@fszalaj` (solo-dev escape hatch).
- **Require status checks to pass before merging**: yes.
  - Required checks (exact job names from §2–§4):
    - `Lint`
    - `Typecheck`
    - `Test`
    - `Build (Node 22)`
    - `Build (Node 24)`
    - `Analyze (javascript-typescript)`
  - Require branches to be up to date before merging: yes.
- **Require conversation resolution before merging**: yes.
- **Require signed commits**: yes.
- **Require linear history**: yes. (Forces squash or rebase merges; no merge commits.)
- **Require deployments to succeed**: optional — leave off for `main` (deploy is downstream of merge).
- **Lock branch**: no.
- **Restrict force pushes**: yes (no force-push to `main`, ever).
- **Restrict deletions**: yes.

**Environment**: `production`
- Required reviewers: `@fszalaj`.
- Prevent self-review: **unchecked** (allow self-approval, solo-dev unblock).
- Deployment branches: `main` only.
- Environment secrets: none required for current setup (uses `GITHUB_TOKEN`).

Apply via `gh` CLI (one-off bootstrap):

```sh
# Documented for recovery — do not commit a script that runs this automatically.
gh api -X PUT \
  /repos/{owner}/{repo}/branches/main/protection \
  --input branch-protection.json
```

Where `branch-protection.json` mirrors the settings above. Keep the JSON in a private gist or password manager — not in the repo (it embeds repo IDs).

## Acceptance criteria

1. **One push to a PR → exactly one CI run + exactly one preview deploy.** Verified by pushing a second commit immediately after the first: the in-flight CI run is cancelled (concurrency group), the new run starts, the preview job similarly supersedes.
2. **One merge to `main` → one deploy + one release-draft update.** `deploy.yml` fires via `workflow_run` once CI completes; `release.yml` fires on `push: main` in parallel.
3. **Supply-chain audit runs nightly.** A failed `npm audit` opens (or updates) a security issue. Pass-runs produce no artefacts.
4. **CodeQL runs weekly + on every PR.** Findings appear under the Security tab.
5. **No workflow can be triggered by a fork without label.** A fork PR with no label produces a warning annotation and skips build/deploy. Adding `safe-preview` triggers a fresh run.
6. **Every `uses:` is SHA-pinned.** A grep `grep -r 'uses:.*@v' .github/` returns nothing (every `@` is followed by 40 hex chars).
7. **Deploy is gated on green CI.** Pushing a commit that breaks `tsc --noEmit` does not deploy; the `workflow_run` trigger fires but the `if:` guard skips.
8. **Signed commits enforced on `main`.** Push of an unsigned commit is rejected by branch protection.
9. **CODEOWNERS gate fires.** A PR touching `.github/workflows/ci.yml` requires `@fszalaj`'s review even if a future collaborator approves it.
10. **Release notes contain no AI attribution.** Manually inspect drafted release notes after the first push following DEC-07 apply — no `Generated with`, no `Co-Authored-By: Claude`, no Anthropic mentions.
11. **Dependabot opens grouped PRs.** First Monday after apply, expect ≤ 2 PRs: one `deps:` (npm groups) and one `ci:` (actions groups).
12. **Local build matches deploy artefact.** `PUBLIC_BASE_PATH=/skyline-scroller/ npm run build` locally produces the same bundle hash as the CI `dist-<sha>` artefact (modulo timestamps).

## Risks

### R1 — SHA pinning makes upgrades manual

Every action upgrade now requires editing a 40-char SHA. Forgetting to update leaves the project on a stale (potentially vulnerable) version.

*Mitigation*: Dependabot's `github-actions` ecosystem block (§9) auto-opens PRs with new SHAs. Group by major version so minor/patch bumps batch into one weekly PR — easy to review and merge. Major bumps come individually, getting proper attention.

### R2 — Required reviewers block solo work

`production` environment requires a reviewer. The user is the only reviewer. If they're the same person who pushed the deploy, GitHub by default refuses self-approval.

*Mitigation*: Configure the environment with "Prevent self-review" **unchecked**. Set the user as a "bypass actor" on the PR ruleset. The PR review gate becomes a soft prompt rather than a hard block — useful for catching obvious mistakes (a confirm-click before deploy) without blocking solo iteration.

### R3 — Fork PRs lose preview deploys

Default behaviour after DEC-07: fork PRs do not get a live preview URL. This may frustrate first-time contributors.

*Mitigation*: Document in `CONTRIBUTING.md` (when added) that maintainers will add the `safe-preview` label after a quick code skim. The label triggers a fresh preview via the `labeled` event type. For trusted contributors, a maintainer can configure a GitHub auto-label rule (or a GH App) to apply the label on PRs from a whitelist of users.

### R4 — `workflow_run` trigger doesn't run on PRs

`workflow_run` triggers only fire on the default branch by default. `deploy.yml` filters on `branches: [main]`. PRs do not trigger deploys (correct), and the `workflow_dispatch` fallback exists for manual recovery.

*Mitigation*: Documented above. Not a real risk, just a behaviour to understand.

### R5 — CodeQL false positives

`security-extended` queries are noisier than the default suite. Expect ~1–3 false positives per scan on a typical Vite/Vitest project (often around `eval`-shaped patterns that aren't actually `eval`).

*Mitigation*: Triage in the Security tab; dismiss with a reason. Document common dismissals in `wiki/operations/codeql-triage.md` (future page). Per DEC-03's safe-eval pattern, the terminal's `eval`-substitute may light up as a finding — that's the page where to capture the rationale.

### R6 — Release-drafter requires labels to categorise

If contributors don't label PRs, all changes fall into a generic "Other" bucket and release notes are ugly.

*Mitigation*: `autolabeler` block (§7) labels PRs automatically based on title prefix (`feat:`, `fix:`, `refactor:`, `perf:`) and file paths (`.github/**` → `ci`, `wiki/**` → `docs`). The user's commit/PR convention is already conventional-commits-style (see commit log: `feat:`, `Fix terminal …`), so most PRs auto-label correctly.

### R7 — Branch protection breaks force-push for emergency recovery

`Restrict force pushes: yes` means even the repo owner cannot force-push to `main`. If a bad commit gets through (e.g. accidentally committed secret), recovery requires temporarily disabling the rule.

*Mitigation*: Document the recovery procedure: (1) repo settings → rules → temporarily disable `main-protection`, (2) force-push the corrected history, (3) re-enable the ruleset. The user is the bypass actor and can perform this without external intervention. Frequency: hopefully zero.

### R8 — `npm audit` noise on dev deps

The 89-package dev tree (Vite, Vitest, transitive) historically has frequent low-severity advisories. `--audit-level=high` filters most of them, but transient high-sev advisories in `esbuild` or `vite` happen 2–3× per year.

*Mitigation*: The audit job opens an issue, not a PR; nothing breaks. Triage path: bump the offending package via Dependabot (usually patch release lands within days), close the issue. If the advisory is unfixable, document in wiki and add `--audit-level=critical` to the dev audit step.

### R9 — `release-drafter` SHA churns frequently

`release-drafter` ships small fixes ~monthly. Pinning means monthly Dependabot PRs for one action.

*Mitigation*: Acceptable — that's the supply-chain trade. The Dependabot group `actions-minor-patch` batches it with other action bumps.

### R10 — `workflow_run` deploy can race a fast follow-up merge

If two PRs merge to `main` within seconds, two `workflow_run` events fire. The `concurrency: pages, cancel-in-progress: true` block ensures only the newer deploy completes, but the older CI's artefact is still on disk briefly.

*Mitigation*: This is the correct behaviour — newer code wins. No additional mitigation needed. Document for future readers.

## References

- `.github/workflows/ci.yml` — current sequential `test → build` flow to be replaced.
- `.github/workflows/deploy.yml` — current re-runs-tests-on-every-deploy flow to be gated on CI artefact.
- `.github/workflows/pr-preview.yml` — current fork-unsafe preview to be guarded by label.
- `package.json` — `scripts.build` reads `vite build`; `vite.config.ts` (DEC-05) reads `PUBLIC_BASE_PATH`.
- `src/config/version.ts` — DEC-05's version barrel, read by `release.yml`.
- [[decisions/DEC-05-low-code-config]] §6 — composite action and base-path env-var (prerequisites).
- [[decisions/DEC-06-cloudflare-outpost]] — Worker preview path `/pr/<n>/` consumed by `pr-preview.yml`.
- build deploy — current state of the three workflows; this DEC supersedes that page's "Pipeline" section.
- GitHub docs: [Pinning actions to a SHA](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions#using-third-party-actions), [workflow_run trigger](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#workflow_run), [Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/managing-environments-for-deployment).
- Related decisions: [[DEC-02-lifecycle]], [[DEC-03-safe-eval-and-error]], [[DEC-04-main-decomposition]].
