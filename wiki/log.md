---
name: Log
description: Append-only chronological log of wiki and project changes. NEW ENTRIES AT TOP.
type: log
---

# Log

## 2026-05-27 - architecture pass 2 kickoff + dead-code batch 1+2 + dependabot

Big day. After DEC-10 + #38/#39/#40 fixes shipped overnight, the user asked for a full second-pass architectural review plus a dead-code sweep.

**DEC-11 architecture pass 2** ([[DEC-11-architecture-pass-2]], [[plans/architecture-pass-2]], [[concepts/test-scenarios]] all filed):
- 5 Explore agents investigated engine / procgen / UI / utils+config / test-coverage; 2 Codex agents verified.
- Adopted 9 proposals. Blocked 3 (CameraController / RenderPipeline / CachedPattern - micro-extractions without boundary).
- Codex MISSING addition: Game.update was querying `#ui-seed-val`/`#ui-time-val` on every frame; engine -> UI DOM leak. Made it Stage A.
- 23-test high-ROI cluster catalogued with concrete numeric assertions (Codex B replaced vague "is deterministic" with seed-specific golden values).

**Shipped today** (all via admin merge - self-hosted homelab runner remained offline so `fidom-verified` gate never materialised; user explicitly authorised the bypass when CI + tests + Codex were green):
- PR #43: DEC-11 Stage A - HUD state snapshot API. `Game.getStateSnapshot()` mutates one cached object; `onTick(cb)` registers listeners; `src/ui/seed-display.ts` owns the HUD DOM. Codex caught a splice-during-iteration race; fix applied (slice the listener list before iterating).
- PR #44: dead-code batch 1 - 4 interaction-free micro-cleanups (Terminal trimLeft->trimStart, Game ctx honest null narrowing, Layer.draw drop unused `_screenHeight`, Tree drop unused `ALL_TREE_TYPES` export).
- PR #35, #36, #37: dependabot bumps - vite-ecosystem patch, codeql-action + release-drafter minor, marocchino/sticky-pull-request-comment 2.x -> 3.0.4 (major bump but only Node-runtime, inputs unchanged).

**Dead-code 11-swarm + Codex L+M cross-review** ([[concepts/test-scenarios]] referenced):
- 11 Explore agents scoured engine / procgen / UI / utils+config / CSS / tests+CI / wiki / Building / Tree / SkySystem / custom-gen / Terminal.
- 24 candidate findings. Two Codex agents independently rejected 9 false positives:
  - Terminal reset y/yes fall-through: intentional ("Executing normally..." documented).
  - SkySystem keyframes t=2.5 + t=4.0: identical by design (darkest-night plateau).
  - SkySystem `bounds.maxX`: stored field unused but local var needed for cloud-spawn off-screen.
  - Random.ts `max <= min` guard: removal would also drop RNG-state-advance + inverted-range semantic.
  - Determinism.test.ts overlap: tests BiomeSystem integration, not just fork.
  - deepClone wrapper: tested shared API.
- 7 more findings deferred to existing DEC-11 stages where they naturally overlap.
- 4 landed in batch 1 (PR #44). Remaining batches: wiki accuracy (PR #45 - this), CSS dedup, registry id removal.

**PR #45 in flight** (this commit): wiki accuracy. 6 entity pages had stale `src/engine/...` source paths; bumped to `src/procgen/entities/...` per PR #15. Loc counts refreshed. `plans/simplification-plan.md` flipped `proposed -> implemented` with completion date and a pointer to [[plans/architecture-pass-2]].

**Deferred** (not done today):
- `maps/complexity.md` + `maps/dependencies.md` regen - per Codex M, defer until after DEC-11 Stages E + H so the maps reflect the new shape.
- Stages B-J of DEC-11 - planned but not started.
- CSS `.setting-group` + `!important` cleanup - Codex M flagged interaction with Stage B + inline-style overrides.
- Registry `id` field removal - changes BiomeDefinition shape; coordinate with Stage F.

**Operational note**: homelab self-hosted runner is offline for at least ~24h now. Admin merge is the pragmatic path while CI + Codex + tests are the gates. If the runner stays flaky we should reassess DEC-10's hard requirement.

## 2026-05-27 - both PRs merged via admin (homelab runner offline)

- **PR #42 merged** (77f8bb3 -> main): layer pixel-snap fix for #40.
- **PR #41 merged** (0079d1c -> main): speed slider UX fix for #38 + #39.
- All three issues (#38, #39, #40) auto-closed via `Closes #N` references in PR descriptions.
- **DEC-10 fidom-verified gate bypassed by admin merge** with explicit user authorization. Reason: self-hosted homelab runner did not pick up `Deploy preview to fidom` job for ~3 hours (workflow stuck `queued`); the `Await manual fidom verification` step never materialised, so branch-protection's required check was missing. Code was sound (build clean, 67/67 tests, Codex independent review APPROVE on #42) so risk of skipping visual verification was low. Not a precedent: runner is the canonical gate path.
- Follow-up: confirm homelab self-hosted runner is healthy before next non-trivial PR. If chronic, document in DEC-10 as a known operational gap.

## 2026-05-26 - speed slider UX fix + flickering issue filed

- **PR #41 opened**: `fix/speed-controls` branch fixes #38 (slider 0 was secretly -1x reverse, not stop) and #39 (basic Simulation Speed bar snapped to centre = 1x when Advanced drove outside [0.1, 10]).
- `src/ui/advanced-window.ts`: slider now strictly non-negative end-to-end. Mapping: 0..500 -> speed 0..1 (500 snaps cleanly to 1.0x), 500..1000 -> 1..max. `speedRange` clamps `min` to `max(0, center - 10)`. Reverse / negative speeds reachable only via the input text box.
- `src/main.ts` `advanced.onSpeedChange`: out-of-range advanced speeds now pin the basic bar to the matching extreme (-1 for slower than 0.1x, +1 for faster than 10x).
- Build 79.36 kB / gzip 22.70 kB (unchanged). Tests 67/67. Hard rules untouched.
- Issues #38, #39 assigned to fszalaj with comment linking to PR #41. Will close on merge.
- **Issue #40 filed**: sub-pixel jitter on biome borders during scroll. Verified by two parallel agents (Explore + Codex rescue). Primary suspect: `cameraX` float passed through `Layer.draw` parallax multiplier (Layer.ts:32) without snapping, combined with non-integer `scaleFactor=1.6` in `Game.ts:228`. Fix path: snap `layerViewX = Math.round(cameraX * speedModifier * effectiveScale) / effectiveScale` so all drawables in a layer step in unison.
- Next: branch `fix/biome-border-flicker` to implement the snap, codex review, fidom preview, approval, merge.

## 2026-05-20 (post-DEC-10) - PR preview on fidom, main on Pages, formal approval gate

- **DEC-10 implemented**: fidom is now PR-preview, Pages is production.
- `pr-preview.yml` rewritten: two-stage build (ubuntu) + deploy (self-hosted, artifact only). Atomic swap via `mv -T` so nginx never sees a half-written tree. Sticky bot comment posts preview URL + link to approval gate. On PR close, rebuild main and redeploy to fidom.
- **Formal approval gate**: GitHub Environment `fidom-verified` with required reviewer. `await-approval` job pauses until user clicks "Review deployments -> Approve" in Actions UI. Branch protection requires this check, blocking merge until current HEAD SHA is approved. Pushing a new commit resets the gate.
- One-time setup documented in README + DEC-10: create `fidom-verified` environment with self as required reviewer, add branch-protection rule requiring `Await manual fidom verification` check on `main`.
- `homelab/.github/workflows/deploy-skyline-scroller.yml` daily cron + path-push triggers DISABLED. Manual + first-time-setup only (would race against PR previews otherwise).
- Verified by 3 Explore agents + Codex. Codex blocked direct-build-on-self-hosted on security grounds; the two-stage split addresses it. Codex also flagged the solo-dev approval problem; GitHub Environment approval (allows self-approve) solves it cleanly.
- README rewritten back to English (was Polish from earlier today). README now documents the full end-to-end flow + one-time setup.

## 2026-05-20 (end of day) - main.ts decomposition + wiki cleanup + v1.2.0

- **DEC-04 implemented**: main.ts 1722 -> 427 LOC (-75.2%) across 10 extracts to `src/ui/`. Status frontmatter updated to `implemented`.
- **25 PR-y zmergowane na main** (#7 do #31). Skrótowo: dekompozycja main.ts (10 PR-ów), hard-rule bugfixy (3), REGIONS adoption + Tree registry + entity moves (3), config centralization + operability (2), CI fixes + house style + dash scrub + bug fix UX + cleanup (7).
- **Wiki cleanup**: 7 pustych stub plików usunięte (`concepts/autocomplete-engine`, `concepts/clouds`, `concepts/dualism`, `concepts/visibility-toggle-class`, `entities/Terminal-Bar`, `decisions/legacy-swarm-history`, `operations/build-and-deploy`). 171 dead wikilinków stripped z 33 plików (były to "phantom nodes" widoczne w Obsidian graph). Vault z 65 -> 60 plików, 0 dead wikilinków.
- **Wersja 1.2.0** bumped (semver minor: nowy `/debug-state` terminal command + `src/config.ts` knobs + massive decomposition). `package.json` ma teraz `engines.node: ">=24.0.0 <27.0.0"`.
- **README.md** zaktualizowane: nowa struktura `src/ui/`, lista 10 modułów, opis nowych terminal commands (`debug-state`), Node 22 -> 24 wymóg, 67 testów.
- **Bundle**: stałe ~79 kB / gzip 22.7 kB mimo całej restrukturyzacji.

## 2026-05-20 (README rewrite) - README po polsku, non-technical

- Przepisany `README.md` w całości po polsku, zgodnie z prośbą użytkownika - ma być zrozumiały dla osoby nietechnicznej.
- Sekcje: gdzie zobaczyć aplikację (GH Pages + fidom z linkami), jak działa pipeline (CI -> deploy.yml -> deploy-fidom.yml), krok-po-kroku instrukcja PR (branch -> push -> PR -> CI -> squash merge -> auto-deploy), etykieta `auto-merge`, sekcja dla developerów.
- Linki do workflowów (`.github/workflows/ci.yml`, `deploy.yml`, `deploy-fidom.yml`), do wiki (`wiki/index.md`, `wiki/hot.md`, `wiki/plans/simplification-plan.md`) i do DEC-09.
- Konwencja: niski rejestr, krótkie zdania, polskie diakrytyki, English w blokach kodu.
- House style: nigdy nie używamy em-dashów ani en-dashów - tylko zwykły "-". Reguła zapisana w pamięci jako `feedback_dashes` i w `wiki/concepts/house-style.md`.

## 2026-05-20 (later) — Recon + DEC-06..09 + Stage 1 commit

- 7-agent recon swarm mapped the user's homelab: Authentik 2026.2.3 Enterprise at `sso.fidom.link` on Deployarr 192.168.0.110, Traefik forward-auth via `chain-authentik`, embedded outpost, 22 apps already protected, HAProxy SNI front on PVE 192.168.0.100, AdGuard wildcard DNS, wildcard cert via DNS-01.
- **DEC-06 (Cloudflare Worker) SUPERSEDED** by [[decisions/DEC-09-homelab-deploy]] — the actual deployment path uses the homelab estate, not Cloudflare Workers (zero Workers exist across all the user's repos).
- DEC-07 (enterprise workflows — 851 LOC) and DEC-08 (master simplification plan — 377 LOC) written.
- Synthesis swarm filled the wiki: 16 entities, 8 systems, 9 concepts, 3 maps. ~38 structured pages in total.
- **Stage 1 executed**: legacy `skyline-scroller/skyline-scroller/` (5MB) + `docs/knowledge_base/` (3.9MB) + dead `src/counter.ts` removed.

## 2026-05-20 (late) — Codex verification + second swarm dispatch

- Codex (`codex:codex-rescue`, job `a907`) returned verdicts on the 13 top swarm-found defects: **12 CONFIRMED, 1 PARTIAL (D16 — vite-config base path), 0 REFUTED.**
- Dominant bug class confirmed: determinism drift. Highest-risk fix: `Function()` eval in `Terminal.speed` (`Terminal.ts:207-210`).
- Dispatched second targeted swarm (5 agents) producing fix-proposal pages into `wiki/decisions/DEC-01..05`.
- Full verdict table archived in [[hot]].

## 2026-05-20 — Wiki bootstrap, 15-agent swarm scan, Codex integration guide

- Created in-repo Obsidian vault at `wiki/`.
- Scaffolded folder tree: `entities/`, `systems/`, `concepts/`, `operations/`, `decisions/`, `maps/`, `_templates/`, `.scan/`.
- Dispatched 15 parallel agents to deeply analyse `src/`, configs, CSS, HTML, tests, build pipeline, and the legacy wiki. All 15 finished.
- Wrote canonical Codex-integration reference at [[operations/codex-integration]] grounded in OpenAI Codex docs (May 2026) and the locally installed `openai-codex/codex@1.0.4` skills.
- Dispatched Codex (`codex:codex-rescue`) for independent verification of 13 top swarm-found defects — still running.
- Pages created: see [[index]]. Raw evidence in `wiki/.scan/`.
- Key insights: 17 distinct defects flagged in [[hot]], 150 dualisms catalogued, dependency graph is a clean DAG with `CityGenerator` as the blast-radius king. `main.ts` (CC=215) is the dominant refactor candidate.
