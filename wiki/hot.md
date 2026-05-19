---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot — 2026-05-20 (Stage 1 complete)

**Status**: Wiki fully populated. 9 ADRs + 1 master plan + 16 entity + 8 system + 9 concept + 3 map pages + Codex integration guide. Stage 1 of [[plans/simplification-plan]] just committed: legacy wiki and dead `counter.ts` removed.

## What's done

- **Scan**: 15-agent first swarm produced `.scan/agent-01..15`. Codex confirmed 12/13 top defects, 1 PARTIAL.
- **Synthesis swarm**: 10 parallel agents produced all entity/system/concept/map pages.
- **Recon swarm**: 7 parallel agents mapped the user's homelab (Authentik 2026.2.3 Enterprise on Deployarr 192.168.0.110 + Traefik + HAProxy + AdGuard wildcards), avl/stackpilot/atos vaults, and Cloudflare infra. Result: DEC-06 (CF Worker) superseded by [[decisions/DEC-09-homelab-deploy]] (the real deployment path).
- **Stage 1 commit**: legacy `skyline-scroller/skyline-scroller/` + `docs/knowledge_base/` + `src/counter.ts` deleted; wiki vault added.

## The 17 verified defects (D1–D17 in [[plans/simplification-plan]])

All confirmed by Codex 2026-05-20. Dominant class: determinism drift. Fix-first: `Function()` eval in `Terminal.speed`. Most user-visible: duplicate `btnGenApply` listener.

## Deployment story (DEC-09)

`skyline-scroller.fidom.link` will go live via:
1. nginx:alpine container on Deployarr serving `/dist/` mounted as readonly volume.
2. `homelab/platform/traefik/dynamic/app-skyline-scroller.yml` registering the Traefik router with `chain-authentik` middleware.
3. Authentik proxy provider in `forward_single_app` mode + application binding to embedded outpost.
4. `.github/workflows/deploy-fidom.yml` building on GH-hosted runner + rsync-ing `dist/` over SSH to Deployarr.
5. Cloudflare DNS: A `skyline-scroller.fidom.link → 83.22.86.80` (DNS-only, grey cloud).
6. Cert: wildcard `*.fidom.link` already auto-renewing — nothing to do.

## Next stages (per [[plans/simplification-plan]])

- **Stage 2**: `src/utils/deepClone.ts` + replace 15 `JSON.parse(JSON.stringify(...))` sites.
- **Stage 3**: DEC-01 RNG `fork(label)` + `nextInt` guard + replace every `Math.random()`/`Date.now()` leak.
- **Stage 4**: DEC-02 dispose hygiene + previewGame leak.
- **Stage 5**: DEC-03 safe expression parser + error toast.
- **Stage 6**: DEC-05 `config/` + `vite.config.ts` + CSS tokens + version sync.
- **Stage 7**: DEC-05 `regions/` declarative biomes.
- **Stage 8**: DEC-04 `main.ts` decomposition phase A (window-manager + tree-settings extracted).
- **Stage 9**: DEC-04 main.ts phase B (remaining modules + double-listener purge).
- **Stage 10**: DEC-09 deploy to `skyline-scroller.fidom.link` + DEC-07 hardened workflows.

Codex review pre-commit on each stage. Direct push to main per user instruction. Estimated net delta: −1300 LOC.

## User constraints (active)

- Aggressive simplify + main.ts decomp.
- Direct push to main.
- Codex review per big diff.
- ALWAYS write to this Obsidian vault, never to `MEMORY.md`.
- No AI attribution in commits/PRs.
