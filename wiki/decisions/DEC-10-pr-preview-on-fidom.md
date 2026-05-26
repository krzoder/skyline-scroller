---
id: DEC-10
title: PR-preview deploys to fidom.link; main deploys to GitHub Pages
status: implemented-with-relaxation
date: 2026-05-20
implemented: 2026-05-20
relaxation_date: 2026-05-27
relaxation_reason: "Homelab self-hosted runner offline > 24h; user instructed agent to operate autonomously. Codex APPROVE + CI green substitutes for the fidom-verified gate until runner returns."
deciders: fszalaj
type: decision
supersedes: []
superseded-by: []
tags: [ci, deploy, preview, security]
related:
  - "[[decisions/DEC-09-homelab-deploy]]"
  - "[[decisions/DEC-06-cloudflare-outpost]]"
  - "[[systems/ui-shell]]"
sources:
  - "swarm verdict 2026-05-20 (3 Explore agents + Codex)"
  - ".github/workflows/pr-preview.yml"
  - ".github/workflows/deploy.yml"
  - "fszalaj/homelab .github/workflows/deploy-skyline-scroller.yml"
---

# DEC-10 - PR-preview to fidom.link, main to GitHub Pages

## Context

After the main.ts decomposition (DEC-04) and the homelab setup (DEC-09), the
deploy story had drifted:

- `deploy.yml` deployed main to GitHub Pages (production). Working.
- `pr-preview.yml` deployed PR builds to GitHub Pages subpath `/pr/<N>/` via
  `gh-pages` branch and `rossjrw/pr-preview-action`. This was DEC-06's design
  for the (since superseded) Cloudflare Workers preview.
- `deploy-fidom.yml` was a manual workflow that rebuilt main and rsynced to
  fidom.
- `homelab/.github/workflows/deploy-skyline-scroller.yml` ran daily at 04:30
  and on path-pushes to also rebuild main and deploy to fidom.

Result: fidom always reflected `main`. Preview testing happened on a Pages
subpath that did not match production hosting characteristics (different
base path, different CDN behaviour, no preview of fidom-specific issues).

The user wanted to invert this: **fidom is for testing PR builds before
merge; Pages always shows main**.

## Constraints

- **No untrusted code on self-hosted runner.** The Deployarr runner has
  root sudo and write access to other apps' data dirs. A PR's `npm ci`
  or `vite build` could RCE the homelab if executed there (swarm + Codex
  flagged this as HIGH risk).
- **Atomic deploy.** nginx serves `/mnt/homelab/apps/data/skyline-scroller/dist/`
  live. A direct `rsync -a --delete` to the live dir is non-atomic and can
  serve partial files for the duration of the sync (swarm: HIGH risk).
- **One preview slot.** fidom is a single subdomain; concurrent PRs can't
  each get their own URL without wildcard DNS + Traefik routing changes
  (out of scope for now).
- **Solo dev workflow.** Owner is the only reviewer; GitHub does not allow
  approving your own PR. A branch-protection rule requiring 1 review would
  deadlock all merges. Codex: drop the formal review gate entirely.

## Decision

**Two-stage workflow** in `.github/workflows/pr-preview.yml`:

1. **Stage 1a (build, untrusted)**: GitHub-hosted ubuntu runner checks out
   the PR HEAD, runs `npm ci && npm run build` with `PUBLIC_BASE_PATH=/`,
   uploads `dist/` as a workflow artifact. PR code never touches the
   self-hosted runner.
2. **Stage 1b (deploy, trusted)**: Self-hosted homelab runner downloads
   the artifact, atomic-swaps it into `/mnt/homelab/apps/data/skyline-scroller/dist/`
   via stage-dir + `mv -T`, then curls the health endpoint.
3. **Stage 2 (comment)**: A sticky PR comment posts the preview URL.
4. **Stage 3 (cleanup)**: When the PR closes (merged or abandoned), a
   separate job rebuilds main on ubuntu and deploys to fidom so no stale
   PR content lingers.

**Global concurrency**: `concurrency: { group: fidom-preview, cancel-in-progress: true }`.
Concurrent PR pushes cancel older runs; fidom always reflects the most
recently pushed PR.

**Approval gate via GitHub Environment, NOT PR review.** Per user clarification:
"zanim merge do main to ma prosic o reczny approval po weryfikacji buildu na fidom.link".
The `await-approval` job targets the `fidom-verified` environment, which has
Required reviewers configured in repo Settings. The job pauses until the user
clicks "Review deployments -> fidom-verified -> Approve and deploy" in the
GitHub Actions UI. Unlike PR review approval, GitHub Environment approval
DOES allow the PR author to self-approve - so this works for a solo dev.

Branch protection on `main` requires the `Await manual fidom verification`
status check, so a PR cannot merge until its current HEAD SHA is approved
in `fidom-verified`. Pushing a new commit invalidates the prior approval
(the new run starts pending again).

One-time repo setup (documented in README):
1. Settings -> Environments -> New environment -> name `fidom-verified` ->
   Required reviewers -> add self.
2. Settings -> Branches -> Branch protection rule on `main` -> Require status
   check `Await manual fidom verification`.

**Atomic swap pattern**:

```bash
STAGE="${DATA_DIR}/.dist.next"
LIVE="${DATA_DIR}/dist"
OLD="${DATA_DIR}/.dist.prev"
sudo rsync -a --delete dist-pr/ "$STAGE/"
sudo mv -T "$LIVE" "$OLD" || true
sudo mv -T "$STAGE" "$LIVE"
sudo rm -rf "$OLD"
```

`mv -T` is atomic on the same filesystem. nginx never sees a half-written tree.

**`homelab/deploy-skyline-scroller.yml` is now manual-only**. The daily
cron and path-push triggers are removed so it does not race against
PR-preview deploys. The workflow stays for first-time setup (Traefik
route + compose include + container start) and emergency main rebuilds.

**`deploy-fidom.yml` in skyline-scroller stays as workflow_dispatch only**
as another emergency "rebuild main on fidom" lever.

`deploy.yml` for GitHub Pages is unchanged - it remains the canonical
production deploy.

## Rejected alternatives

- **Branch protection with required PR review approval**: deadlocks solo
  dev. GitHub does not let the PR author approve their own PR review.
  Environment approval is different - the author CAN self-approve their
  own deployment.
- **`preview-approved` label gate + required status check** (Codex
  initial suggestion): works but adds workflow surface; GitHub Environment
  approval is the built-in primitive for this.
- **No formal approval gate** (initial design before user clarification):
  rejected - user explicitly asked for a manual approval click "po
  weryfikacji buildu na fidom.link".
- **Building PR code on self-hosted**: rejected by Codex on security
  grounds. Two-stage build/deploy split is non-negotiable.
- **One preview slot per PR via subdomain**: requires wildcard DNS, new
  Traefik routes per PR, and rebuilding the wildcard cert. Out of scope.
- **No cleanup on PR close**: rejected by Agent 2 and Codex - stale PR
  content survives the PR and silently lies. Cleanup must rebuild main.

## Operational notes

- **Latest-PR-wins**: if PR-A is open and someone pushes to PR-B, fidom
  switches to PR-B's content. The sticky comment on each PR documents
  this so reviewers don't get confused.
- **Cleanup commits to fidom**: when ANY PR closes, fidom rebuilds from
  main. If multiple PRs close in quick succession the last cleanup wins;
  cancel-in-progress on the `fidom-preview` group ensures only one
  rebuild runs at a time.
- **Artifact retention**: 7 days. Long enough to debug a deploy that
  shipped but failed at runtime.
- **No PR comment on forks without `safe-preview` label**: the existing
  fork-guard pattern is preserved.

## Smoke test

After this change ships:
1. Open a draft PR with a trivial change (typo in a comment).
2. Wait ~2 min, watch for sticky comment "Preview live: fidom.link/".
3. Visit fidom, confirm the change is visible.
4. Push another commit. Sticky comment updates. fidom serves the new SHA.
5. Close the PR without merging. Cleanup job runs; sticky updates to
   "PR closed - fidom rebuilt from main".
6. fidom shows main's dist again.

## Follow-ups (not in this ADR)

- **Per-PR slot**: when contributor volume grows, introduce
  `pr-<N>.skyline-scroller.fidom.link` via wildcard DNS + Traefik rule
  per PR. Owner-controlled cleanup on close.
- **Required-status check for `preview-approved` label**: introduce when
  there is a second human reviewer. Until then the bot comment is the
  only "approve before merge" prompt.
