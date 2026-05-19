# Agent 10 — Build, Tooling, CI/CD

Scope: package manifest, TypeScript config, gitignore, GitHub Actions workflows, missing Vite config.

## Files scanned

- `/Users/fszalaj/Documents/git/skyline-scroller/package.json` (17 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/package-lock.json` (skim only — 1459 LOC, **89 `node_modules/` entries** — full transitive tree from just 3 direct devDeps)
- `/Users/fszalaj/Documents/git/skyline-scroller/tsconfig.json` (27 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/.gitignore` (25 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/.github/workflows/ci.yml` (49 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/.github/workflows/deploy.yml` (42 LOC)
- `/Users/fszalaj/Documents/git/skyline-scroller/.github/workflows/pr-preview.yml` (41 LOC)
- `vite.config.*` — **does not exist** (finding, not omission)

## Public surface (exports/classes/functions/types)

Not applicable in the traditional sense — this scan is config-only. The "public surface" exposed by these files is:

- **npm scripts** as the developer-facing API:
  - `npm run dev` → `vite` (dev server with HMR, default port 5173, no base-path override → served at `/`)
  - `npm run build` → `tsc && vite build` (type-check **then** bundle; tsc with `noEmit` acts as gate)
  - `npm run preview` → `vite preview` (serve `dist/` locally, sanity-check the build)
  - `npm test` → `vitest run` (one-shot, non-watch — CI-friendly)
- **CI surface**: three workflows (`CI`, `Deploy to GitHub Pages`, `PR Preview`) — each consumes the npm scripts plus `tsc`/`vite build` directly.
- **Public artifact**: GitHub Pages site at `https://<owner>.github.io/skyline-scroller/` (inferred from `--base=/skyline-scroller/`).

## Internal state

- **TypeScript config posture** — "bundler mode" (Vite-canonical):
  - `target: ES2022`, `module: ESNext`, `moduleResolution: bundler` — no Node-style resolution, Vite owns module graph.
  - `noEmit: true` — tsc is a **linter only**; bundling is Vite's job.
  - `allowImportingTsExtensions: true` — source can write `import './foo.ts'` explicitly.
  - `verbatimModuleSyntax: true` — forces `import type` for type-only imports; no auto-erasure surprises.
  - `erasableSyntaxOnly: true` — bans enums, namespaces, decorators with metadata, parameter properties, etc. Project is "type-strip ⇒ JS" compatible (Node 22 `--experimental-strip-types`, esbuild, swc). Foreshadows zero-runtime-TS-feature discipline.
  - `useDefineForClassFields: true` — class fields use real `[[Define]]` semantics.
  - `moduleDetection: force` — every file is a module (no global script pitfalls).
  - **Strict block**: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `noUncheckedSideEffectImports`. Tight.
  - `types: ["vite/client"]` only — narrows ambient types; no `@types/node` in dev (deliberate browser-only typing).
  - `include: ["src"]` — tests outside `src/` would not be type-checked by `tsc`.
- **Lockfile state**: 89 `node_modules/*` entries from 3 direct devDeps (`typescript`, `vite`, `vitest`). Most transitive packages belong to `vite` (rollup, esbuild) and `vitest` (chai, tinypool, etc.). **Zero runtime dependencies** — `dependencies` block is absent entirely.
- **`.gitignore`**: covers `node_modules`, `dist`, `dist-ssr`, `*.local`, common log patterns, OS/editor cruft. Allowlists `.vscode/extensions.json` (the one IDE-config file shared in repo). No `coverage/` ignore — none generated yet.
- **Version drift**: `package.json` declares `1.0.0-beta`. Recent commits reference "Beta 1.1.1 UI" and "Beta 1.1.2 gen". Manifest is **two minor-beta cycles behind** the commit narrative.

## Control flow

### Developer loop
```
edit src/ → vite (dev) → HMR reload
       ↓
   npm test  (vitest run)
       ↓
   npm run build  (tsc gate → vite build → dist/)
       ↓
   npm run preview  (verify dist/)
```

### CI pipeline (push to `main`, PR targeting `main`)
`CI` workflow: two sequential jobs:
1. `test` — checkout, Node 22 + npm cache, `npm ci`, `npx tsc --noEmit`, `npm test`.
2. `build` — `needs: test`, `npx vite build --base=/skyline-scroller/` (no separate tsc here; relies on `test` job for type gate).

### Deploy pipeline (push to `main`, manual `workflow_dispatch`)
`Deploy to GitHub Pages`: single job:
- `concurrency: pages, cancel-in-progress: false` — queue, don't drop deploys.
- `npm ci → npm test → npx tsc && npx vite build --base=/skyline-scroller/ → peaceiris/actions-gh-pages@v4` publishes `./dist` with `keep_files: true` (preserves files outside the build — critical for PR-preview coexistence).
- `permissions: contents: write` — pushes to `gh-pages` branch (peaceiris default).

### PR preview pipeline (PR opened/synchronize/reopened/closed)
`PR Preview`: single job:
- `concurrency: pr-preview-${{ github.ref }}, cancel-in-progress: true` — newer pushes supersede older builds **per-PR**.
- Build with `--base=/skyline-scroller/pr-preview/pr-<N>/`.
- `rossjrw/pr-preview-action@v1` from `./dist` — publishes under `pr-preview/pr-<N>/` on `gh-pages`, posts comment with link, **cleans up on PR close**.

### Branching/release model (inferred)
- Trunk-based: single long-lived branch `main`.
- Feature work happens on PR branches; PR preview gives each PR a live URL.
- Merge to `main` triggers production deploy.
- No release tags / no `release` workflow / no semver bumps in CI — version in `package.json` is hand-edited (and currently stale).

## Dependencies (imports / imported-by, even if known indirectly)

- **Direct devDeps**: `typescript ~5.9.3`, `vite ^7.2.4`, `vitest ^4.1.6`. That's it.
- **Zero runtime dependencies** — the engine is pure DOM/Canvas API. This is a deliberate architectural property and one of the most defining traits of [[entities/Game]] / [[concepts/Zero-Dependency Engine]].
- **Tilde vs caret asymmetry**: `typescript ~5.9.3` (patch-only) vs `vite ^7.2.4` and `vitest ^4.1.6` (minor). Reflects TS's reputation for breaking nominal type checks in minors.
- **Workflow action deps**: `actions/checkout@v4`, `actions/setup-node@v4`, `peaceiris/actions-gh-pages@v4`, `rossjrw/pr-preview-action@v1` — all major-version-pinned (not SHA-pinned).
- **Indirect dependencies (lockfile)**: 89 transitive entries dominated by Vite's rollup/esbuild stack and Vitest's tinypool/chai stack.

## Complexity & hotspots

- All three workflows duplicate the "checkout → setup-node@22 + cache npm → npm ci" preamble — **3× repetition**. A composite action or reusable workflow could DRY this.
- `Deploy` and `PR Preview` both run `npm test` again even though `CI` already ran it on the same SHA. Trades a few minutes of CI time for the guarantee that deploys are never published from a red build (defensible).
- `CI`'s `build` job uses `--base=/skyline-scroller/` but discards the artifact (no upload-artifact, no cache reuse for `Deploy`). The build is exercised purely for "does it bundle" signal. Three separate `vite build` invocations across the three workflows.
- `tsconfig` is small but strict — most surface for type errors is in `src/`. The strict + erasable-syntax-only stance keeps the codebase TS-feature-light (no enums, no namespaces).
- `tsconfig` includes only `src` → if tests live outside `src/`, they bypass `tsc --noEmit`. Worth checking against agent-13 (tests).

## Dualisms & duality patterns observed

- **dev vs build** — `vite` (no type-check, HMR) vs `tsc && vite build` (type-gate then bundle). Two execution modes of the same source.
- **CI vs Deploy** — `CI` is a gate (test + build verification, no publication); `Deploy` publishes. Both run on `push: main` but the `CI` `build` job's output is thrown away.
- **PR vs main** — same toolchain, different base-paths: `/skyline-scroller/` (prod) vs `/skyline-scroller/pr-preview/pr-N/` (ephemeral). Both deploy to the same `gh-pages` branch via `keep_files: true`.
- **Lockfile vs manifest** — manifest declares 3 deps, lockfile pins 89 packages. The manifest is the contract; the lockfile is the realization.
- **`package.json` version vs commit message version** — `1.0.0-beta` (manifest) vs "Beta 1.1.2" (commit messages). Two sources of "current version" disagreeing.
- **tsc vs Vite** — tsc is the type-truth oracle (`noEmit`), Vite is the bundle-truth oracle. Neither produces what the other consumes; they are parallel pipelines over the same source.
- **strict vs erasable** — TS strictness maxed; TS syntax features minimised. The language is shrunk to its type-system-only core.
- **`cancel-in-progress` true vs false** — PR preview cancels superseded builds (cheap, ephemeral); Pages deploy queues them (no lost deploys, even if slow).
- **patch-pin (~) vs minor-pin (^)** — TypeScript trusted only at patch level, Vite/Vitest trusted at minor. Asymmetric trust in semver discipline of upstream.
- **runtime vs build-time deps** — runtime: zero (pure Canvas). Build-time: 89 transitive packages. The shipping artifact is feather-light; the developer machine is not.
- **`include: src` vs everything else** — tsc only sees `src/`; config files, tests-if-outside, scripts-if-any are untyped.

## Invariants

- **Zero runtime dependencies** — `package.json` has no `dependencies` block. Any future addition would break this.
- **Single trunk branch `main`** — all three workflows treat `main` as the only long-lived branch.
- **Base path `/skyline-scroller/` in production** — must match the GitHub Pages repo path; if repo is renamed, all three workflows need updates.
- **`gh-pages` branch is the publish target** — both deploy actions write to it; `keep_files: true` on the production deploy is what allows `pr-preview/` subtree to coexist.
- **Node 22 everywhere** — all three workflows hard-code the same major. No matrix.
- **`tsc --noEmit` before bundling** in the build script — type errors fail the build locally; CI replicates via the `test` job before `build`.
- **Tests must pass before any deploy** — `CI.build needs: test`, `Deploy` runs `npm test` inline, `PR Preview` runs `npm test` inline.
- **Type-only linting**: `tsc` produces no `.js` files anywhere in the toolchain — Vite + esbuild handle all transpilation.

## Surprises / risks / TODOs

- **No `vite.config.{ts,js,mjs}` file exists.** Vite runs entirely on defaults:
  - Root = repo root.
  - `index.html` must live at repo root (verify against agent-1's scan).
  - **Base path is not in config** — it's passed via `--base=/skyline-scroller/` on every CI invocation. Run `npm run build` locally and you get a broken-path build for Pages. Run `npm run dev` and there is no base prefix.
  - This means: **dev and CI ship different artifacts** by construction. Local `npm run build` does **not** match what gets deployed. To reproduce a deploy artifact locally, you must invoke `npx vite build --base=/skyline-scroller/` directly.
  - A `vite.config.ts` with `base: process.env.BASE_URL ?? '/'` would consolidate this.
- **Version drift**: `package.json` says `1.0.0-beta`; commits since (`504979f Beta 1.1.2 gen`, `f1f5902 Beta 1.1.1 UI`) reference newer versions never written back to the manifest. Future `--release` automation would consume `package.json.version` and ship the wrong number.
- **Engine has no tests yet** — `npm test` runs `vitest run`. Agent-13 should confirm what's actually tested; the deploy workflow gates on tests passing, but if there are only smoke tests, the gate is weak.
- **`tsconfig` includes `src` only** — tests outside `src/` would never get type-checked, even though they run under vitest (which can use its own TS pipeline via esbuild). Possible split between "what tsc validates" and "what vitest executes".
- **No CodeQL, no Dependabot config visible in `.github/`** — only workflows. Security scanning relies entirely on the host (GitHub default).
- **`peaceiris/actions-gh-pages@v4` is major-pinned not SHA-pinned** — supply-chain risk if action is compromised. Same for `rossjrw/pr-preview-action@v1` (v1 has been around for years, so the surface area is larger).
- **`permissions: contents: write` in Deploy** — peaceiris approach (push to `gh-pages` branch). Modern alternative is `actions/deploy-pages@v4` with `pages: write, id-token: write` (no branch). Current setup is the **classic** pattern, not the Pages-native one. Trade-off: classic supports `keep_files: true` (needed for PR-preview coexistence); Pages-native does not.
- **No coverage reporting** — `vitest run` outputs pass/fail only; no `--coverage` flag, no `.gitignore` entry for `coverage/`.
- **No `engines` field** — repo claims Node 22 in CI but doesn't declare a minimum runtime. Contributors can use any Node.
- **Three duplicate "setup Node + npm ci" preambles** — could be a composite action.
- **`CI.build` discards its artifact** — wasted work; could be a sanity check only or could `upload-artifact` for reuse, but isn't.
- **`Deploy`'s `keep_files: true` is the *only* mechanism that keeps PR previews alive after a main push.** If this flag were ever removed, every merge to main would wipe all open PRs' preview URLs.

## Suggested wiki pages

- [[concepts/Zero-Dependency Engine]] — the property of having no runtime deps; defining trait of the codebase.
- [[concepts/Bundler-Mode TypeScript]] — explain the `moduleResolution: bundler` + `noEmit` + `verbatimModuleSyntax` + `erasableSyntaxOnly` posture and what it enables.
- [[concepts/Erasable Syntax Discipline]] — what `erasableSyntaxOnly: true` forbids and why (Node-strip-types compat, esbuild simplicity).
- [[operations/Build Pipeline]] — the dev/build/preview/test scripts and their relationships.
- [[operations/CI Workflow]] — the test→build sequence on push/PR.
- [[operations/Pages Deploy]] — production deploy mechanics, `gh-pages` branch, `keep_files: true`.
- [[operations/PR Preview]] — ephemeral previews under `pr-preview/pr-N/`, lifecycle tied to PR state.
- [[decisions/No Vite Config File]] — defaults + CLI `--base` instead of a config file; trade-offs.
- [[decisions/Base Path In CI, Not Config]] — why the base path lives in three workflow YAMLs instead of one config.
- [[decisions/Trunk-Based With PR Previews]] — branching model inferable from workflows.
- [[decisions/Classic gh-pages Action Over Pages-Native]] — rationale tied to `keep_files: true`.
- [[risks/Version Drift In Manifest]] — `1.0.0-beta` vs `1.1.2` in commit log.
- [[risks/Local Build Does Not Match Deploy]] — base-path divergence between `npm run build` and CI build.
- [[risks/Engine Untested]] — pending agent-13 confirmation.
- [[entities/package.json]], [[entities/tsconfig.json]], [[entities/CI Workflow]], [[entities/Deploy Workflow]], [[entities/PR Preview Workflow]].
