---
name: Hot cache
description: Rolling current-state snapshot of the project. Overwrite each substantive session.
type: hot
---

# Hot - 2026-05-20 (end of day, post-DEC-10)

**Status**: 25 PR-ów zmergowanych na main, 0 open, 0 zombie branche, 0 issues. Tests 67/67. Build clean. Bundle 79.4 kB / gzip 22.7 kB. Wersja **1.2.0**. README po angielsku.

## Deploy story (DEC-10, 2026-05-20)

- **GitHub Pages (`krzoder.github.io/skyline-scroller/`)** = production. Auto-deploys on push to `main` via `deploy.yml`. No change.
- **fidom.link (`skyline-scroller.fidom.link`)** = PR preview. `pr-preview.yml` builds PR HEAD on ubuntu-hosted runner, atomic-swaps dist into nginx via self-hosted homelab runner. Sticky bot comment posts preview URL + link to approval gate.
- **Approval gate (BLOCKING merge)**: GitHub Environment `fidom-verified` with required reviewer (self). Job `await-approval` pauses until user clicks "Review deployments -> Approve" in GitHub Actions UI. Branch protection on `main` requires this status check, so merge stays blocked until current HEAD SHA is approved. Pushing a new commit invalidates prior approval.
- **One-time setup TODO**: tracked in [[operations/dec-10-manual-setup]] (2 steps in GitHub UI: create `fidom-verified` env with required reviewer + add branch protection check on `main`). Approval gate will not block merges until both are applied.
- On PR close (merge or abandon), rebuilds main and deploys to fidom so no stale content lingers.
- Security: PR's npm scripts run on GitHub-hosted (untrusted); self-hosted only does artifact download + atomic mv (trusted). Codex flagged this as a blocking requirement.
- Concurrency: global `fidom-preview` group with cancel-in-progress. Latest PR push wins. Documented in sticky comment.
- Homelab repo's `deploy-skyline-scroller.yml` daily cron + path-push triggers DISABLED (manual + first-time-setup only) to avoid racing with PR previews.
- `deploy-fidom.yml` in skyline-scroller stays as emergency "rebuild main → fidom" lever (workflow_dispatch only).

## Wielka dekompozycja main.ts (DEC-04 implemented)

```
main.ts: 1722 -> 427 LOC  (-1295 LOC, -75.2%)
```

10 modułów wycięte do `src/ui/`:

| Moduł | LOC | Odpowiedzialność |
|---|---:|---|
| custom-gen.ts | 593 | Custom Generation panel (preview Game + tree config) |
| advanced-window.ts | 230 | Advanced Options (clock format + advanced speed eval) |
| terminal-bind.ts | 185 | Terminal mount + history + autocomplete |
| audio-controls.ts | 117 | Volume slider + mute + wheel-volume + lazy bubble |
| gestures.ts | 97 | Fullscreen + pointer-lock drag + dblclick reset |
| keyboard-shortcuts.ts | 72 | f/g/r/s/a/m/t/Enter/Escape priority chain |
| seed-controls.ts | 37 | Seed input + Set/Randomize buttons |
| error-toast.ts | 37 | HUD toast + global error handlers |
| window-manager.ts | 24 | toggleWindow + dismissOnOutsideClick |
| settings-window.ts | 23 | btnSettings toggle + outside-click dismiss |

main.ts to teraz tylko HTML template + DOM refs + orchestration init + `syncUIFromTerminal`.

## Hard rules wszystkie czyste

- D18 (`Function()` eval) - PR #9
- D19 (`Math.random()` w preview) - PR #9
- deepClone fake fix (`JSON.parse(JSON.stringify())` -> `structuredClone()`) - PR #13
- ALL_BIOMES mutability trap (`Object.freeze` + readonly) - PR #31
- SkySystem `Date.now()` fallback (rng required) - PR #31
- `[INEFFECTIVE_DYNAMIC_IMPORT]` Vite warning - PR #31

## Inne istotne refaktoringi

- REGIONS jako single source of truth dla danych biomu (PR #14)
- Tree TREE_SPECS registry (PR #16)
- Entity files moved engine/ -> procgen/entities/ (PR #15)
- src/config.ts dla tunable constants (PR #19)
- `/debug-state` terminal command + dev-setup Node 24 preflight (PR #18)

## Tests

5 plików, 67 case'ów:
- `Random.test.ts` - 14 cases (fork + nextInt edge + distribution)
- `deepClone.test.ts` - 8 cases (Date, Map+Set, NaN, circular)
- `Expression.test.ts` - 36 cases (parametrized: arithmetic + safety reject)
- `regions.test.ts` - 7 cases (registry + frozen contract)
- `Determinism.test.ts` - 3 cases (DEC-01 BiomeSystem stream identity)

Wciąż brakuje: integration test dla CityGenerator stream identity + REGIONS->backgroundGround contract (deferred, Codex flagged).

## Wiki vault cleanup (2026-05-20 koniec dnia)

- **7 pustych stub plików usunięte** (0 bajtów każdy): `concepts/autocomplete-engine`, `concepts/clouds`, `concepts/dualism`, `concepts/visibility-toggle-class`, `entities/Terminal-Bar`, `decisions/legacy-swarm-history`, `operations/build-and-deploy`.
- **171 dead wikilinków stripped z 33 plików** - to były "phantom nodes" widoczne w Obsidian graph view jako puste tytuły bez treści. Skonwertowane do plain text gdzie miały sens, usunięte gdzie nie.
- Vault: **60 plików .md** (było 65), 0 dead wikilinków (poza `.scan/` które są immutable raw scan output).

## Deployment

- **GitHub Pages** (`krzoder.github.io/skyline-scroller/`) - automat po merge do main, ~2-3 min.
- **fidom.link** (`skyline-scroller.fidom.link`) - self-hosted runner workflow w `fszalaj/homelab` (Traefik route + nginx compose + dist sync). Manual trigger; auto-trigger TODO.
- Bundle 79.4 kB / gzip 22.7 kB.
- Node 24 (Active LTS) wymagany - `package.json` ma `engines.node: ">=24.0.0 <27.0.0"` od PR #docs/end-of-day-update.

## Otwarte sprawy (świadomie deferred)

- 3x `Math.random()` w `src/ui/seed-controls.ts` + `src/ui/custom-gen.ts` (linia 521, 560) - policy nit: hard rule mówi "tylko main.ts + Terminal.ts". To są legitimowane entropy entry pointy z dekompozycji - albo update rule, albo refactor.
- CityGenerator `pickMaterial`/`pickRoof`/`pickColor` - dane są już w REGIONS, ale logika ich nie używa. Wymaga determinism test rozszerzenia przed refactorem.
- Palette extraction (~30 inline kolorów w `src/ui/`) - kosmetyczne, niski priorytet.
