---
name: Log
description: Append-only chronological log of wiki and project changes. NEW ENTRIES AT TOP.
type: log
---

# Log

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
