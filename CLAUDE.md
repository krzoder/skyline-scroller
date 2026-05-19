# CLAUDE.md — project-level instructions

Auto-loaded by Claude Code at session start.

## What this project is

**Skyline Scroller** — a TypeScript + Vite procedural parallax landscape scroller rendering to HTML5 Canvas 2D. ~5k LOC, no runtime dependencies (the shipping bundle is pure Canvas API + transpiled TS).

- Source: `src/`
- Tests: `tests/` (vitest)
- Wiki: `wiki/` (the canonical knowledge layer; open as an Obsidian vault)
- GitHub: ships to GitHub Pages (`fszalaj.github.io/skyline-scroller/`) and to `skyline-scroller.fidom.link` (public — no auth gate).

## Wiki-first policy

The Obsidian vault in `wiki/` is the **canonical knowledge layer**.

- Before substantive work, read [[hot]] (`wiki/hot.md`) — the rolling current-state snapshot.
- The master plan is at `wiki/plans/simplification-plan.md` — read it before starting refactor work.
- After substantive changes, update the relevant `wiki/entities/*.md` or `wiki/systems/*.md` page and append a new entry at the TOP of `wiki/log.md`.
- ADRs live in `wiki/decisions/DEC-NN-*.md`. New architectural decisions get a new ADR.
- Raw agent-scan outputs live in `wiki/.scan/` — keep them; future agents may re-fold them.

If you clone fresh: run `bash scripts/setup-vault.sh` to register `wiki/` with Obsidian.

## Hard rules

- **No `Math.random()` in engine code.** Use `Random` from `src/utils/Random.ts` with `fork(label)` for sub-streams. The only legitimate `Math.random()` sites are user-facing "random seed" buttons in `main.ts` and `Terminal.ts` (entropy entry points). Determinism is a contract — see `wiki/concepts/determinism.md`.
- **No `Function()` / `eval()` of user input.** Use `evalExpression` from `src/utils/Expression.ts`.
- **No deep-clone via `JSON.parse(JSON.stringify(...))`.** Use `deepClone` from `src/utils/deepClone.ts`.
- **No `alert()` for errors.** Use the `#error-toast` helper in `src/main.ts`.
- **No AI attribution in commits, PRs, or comments.** Commit author is the user.

## Working

- `npm run dev` — local dev server (Vite).
- `npm run build` — full typecheck + Vite build. Output → `dist/`.
- `npx vitest run` — test suite. Must stay green.
- `npm run build && npx vitest run` — pre-commit gate.

## Style

- Don't add comments that restate what the code does.
- Don't write multi-paragraph docstrings. One short WHY-line max.
- Don't add features the user didn't ask for. Don't refactor surrounding code while fixing a bug.
- Defensive checks only at system boundaries (DOM, user input). Internal code trusts internal code.

## Codex collaboration

Use `Agent({ subagent_type: "codex:codex-rescue", … })` for second opinions on substantive diffs, hostile-input verification, or independent verification of multi-agent swarm findings. Full reference: `wiki/operations/codex-integration.md`.

## Subagents

Local agents under `.claude/agents/`:
- `wiki-curator` — read-only, proposes wiki updates from recent commits.
- `slop-hunter` — single-file slop removal without behavior change.
- `codex-review` — wraps `codex:codex-rescue` for diff review.

## Hosting

- GitHub Pages — `fszalaj.github.io/skyline-scroller/` (existing).
- fidom.link — `skyline-scroller.fidom.link` via homelab Traefik + nginx container on Deployarr (public, no Authentik). See `wiki/decisions/DEC-09-homelab-deploy.md`.

## Where to start

1. `wiki/index.md` — full TOC.
2. `wiki/hot.md` — current state.
3. `wiki/plans/simplification-plan.md` — master plan.
4. `wiki/maps/dependencies.md` — module graph.
