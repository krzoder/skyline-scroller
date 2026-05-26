---
type: meta
title: "Lint Report 2026-05-27"
created: 2026-05-27
updated: 2026-05-27
tags: [meta, lint]
status: developing
---

# Lint Report: 2026-05-27

Triggered by user request "verify and tune the [Obsidian plugin] approach" - this is the first formal `wiki-lint` run on the skyline-scroller vault (in-repo). Past clean-ups (171 dead wikilinks stripped on 2026-05-20 per [[log]]) were ad-hoc; this report applies the canonical skill checklist.

## Summary

- Pages scanned: **62** (excluding `.scan/`, `.obsidian/`, `_templates/`)
- DragonScale opt-in: **0** (no `./scripts/allocate-address.sh`; address validation + semantic tiling skipped per skill spec)
- Issues found: **~180** (mostly dead wikilinks)
- Auto-fixed: **0** (lint observes only; awaiting user decision)
- Needs review: **all** (most are aspirational links to never-created concept pages)

## Dead Links

**~146 dead wikilink targets** across the vault (215 unique references → only 62 pages exist; ~70% of references are dead). High-volume sources:

- `plans/simplification-plan.md`: ~30 dead refs (concept stubs referenced but never created: `[[concepts/dualism]]`, `[[concepts/escape-priority-stack]]`, `[[concepts/safe-eval]]`, `[[concepts/idempotent-render]]`, etc.). Most are pseudo-wikilinks where author dropped the brackets to *mention* a concept rather than *link* to one.
- `decisions/DEC-*.md`: ~25 dead refs to `[[concepts/X-style-name]]` (kebab-cased concept names that don't match real PascalCase page names).
- `maps/dependencies.md` + `maps/complexity.md`: ~10 dead refs each (stale `agent-NN` references to deleted `.scan/` files, plus mid-text wikilinks broken by trailing punctuation - e.g., the regex captured `[[CityGenerator]], [[BiomeSystem]], [[Random` as one "link").

### Categories (recommend handling per category)

1. **Prose-style "wikilink" mentions** (~80 cases): `[[concept name with spaces]]` used as emphasis, not linking. Recommend: strip brackets (plain text) since no real page is intended.
2. **Wrong-case / kebab-case mismatches** (~30 cases): `[[concepts/control-flow]]` vs actual page `[[control-flow]]`. Recommend: normalise to flat filenames per CLAUDE.md ("Wikilinks flat: `[[Note Name]]`, not `[[folder/Note]]`").
3. **Genuine missing pages** (~15 cases): `[[Refactor Heat-Map]]`, `[[Dependency Graph]]`, `[[Cyclomatic Complexity Proxy]]` — referenced from multiple files; would benefit from stub creation OR plain-text-ing.
4. **Aspirational future pages** (~20 cases): `[[concepts/Accessibility-Gaps]]`, `[[concepts/add-new-tree-type]]` — referenced once each in plan documents; safe to strip brackets.

## Orphan Pages

**30+ pages with no inbound `[[Page]]` references** (detection uses bare-name match; some are linked via folder-prefixed `[[entities/Page]]` syntax which my regex missed - recount needed):

Highest-confidence orphans (no folder-prefix variant found either):
- `wiki/concepts/test-scenarios.md` (newly created 2026-05-27 by DEC-11) → fix: add to [[index]] under Concepts.
- `wiki/plans/architecture-pass-2.md` (created today) → fix: add to [[index]] under Plans.
- `wiki/decisions/DEC-11-architecture-pass-2.md` (created today) → fix: add to [[index]] under Decisions.

Lower-confidence (likely linked but via wrong-format wikilinks):
- All `wiki/entities/*.md` (linked via `[[entities/XXX]]` not `[[XXX]]`).
- All `wiki/systems/*.md` (same pattern).

Recommendation: fix the wikilink convention first (Category 2 above), then re-run orphan detection.

## Missing Pages

Inferred from "mentioned 3+ times but no page" pattern:

- `[[concepts/escape-priority-stack]]` — referenced in DEC-04, simplification-plan, control-flow. **Recommend stub creation.**
- `[[concepts/idempotent-render]]` — referenced in DEC-02, simplification-plan. **Recommend stub creation.**
- `[[concepts/preview-game-mirror]]` — referenced in DEC-04. Single ref - optional stub.

## Frontmatter Gaps

**None.** Every scanned page has a `---` frontmatter block. Compliance ✓.

(Stricter check for *required fields* by type was not run; concepts only require `type:`, decisions require `status`, etc. Spot-check found DEC-11 has `status: proposed` but Stage A has merged → mark `partially-implemented` per Codex docs swarm 10 finding.)

## Stale Claims

From the parallel "menu+steering" docs swarm (today):
- `maps/complexity.md` says `main.ts` is 1,894 LOC; actual is 435 (post-DEC-04). Stale by ~3.4×.
- `maps/dependencies.md` graph drawn before entity migration to `procgen/entities/`.
- `plans/simplification-plan.md` flipped `proposed -> implemented` in PR #45 today. ✓ current.
- `DEC-11` is `status: proposed` but Stage A merged. Should be `partially-implemented`.

## Stale Index Entries

`wiki/index.md`:
- Plain text `"build deploy"` instead of `[[operations/build-and-deploy]]` link. Either create the page or strip the prose link.
- Missing entry for `[[concepts/test-scenarios]]` (added today).
- Missing entry for `[[plans/architecture-pass-2]]` (added today).
- Missing entry for `[[DEC-11-architecture-pass-2]]` (added today).

## Address Validation

Skipped — DragonScale opt-in `0` (no `./scripts/allocate-address.sh`).

## Semantic Tiling

Skipped — `./scripts/tiling-check.py` not present.

## Naming Convention Compliance

CLAUDE.md says: "Wikilinks flat: `[[Note Name]]`, not `[[folder/Note]]`. Filenames are unique across vault."

- **62 / 62 filenames are unique** across folders ✓.
- **~30 sites use folder-prefixed wikilinks** (`[[concepts/foo]]`, `[[entities/Game]]`, `[[decisions/DEC-04-main-decomposition]]`). Per CLAUDE.md convention these should be flat. Convert to `[[foo]]`, `[[Game]]`, `[[DEC-04-main-decomposition]]`.

Doing this conversion would also resolve ~25 of the "dead link" Category 2 cases above (the kebab/folder mismatch).

## Writing Style Check

Spot-checked DEC-11 and architecture-pass-2 (both created today): declarative present tense ✓, claims have source ✓, no uncertainty/contradiction callouts (none needed for this content).

Older pages may benefit from a `> [!gap]` audit but the bulk of legacy content is stable.

## Recommended next actions

Per skill: "Always show the lint report first. Ask whether to auto-fix or review each."

**Safe to auto-fix in one pass:**
1. Add `[[test-scenarios]]`, `[[architecture-pass-2]]`, `[[DEC-11-architecture-pass-2]]` to `index.md`.
2. Flip `DEC-11` status to `partially-implemented`.
3. Convert ~30 folder-prefixed wikilinks to flat (regex replace, verify with grep after).
4. Strip Category 1 "prose-style wikilinks" (~80) to plain text where no link is intended.

**Needs human judgement:**
- Whether to create stubs for `[[escape-priority-stack]]` + `[[idempotent-render]]` (load-bearing concepts referenced from DECs).
- Whether to regenerate `maps/complexity.md` + `maps/dependencies.md` now or defer until DEC-11 Stage E + H land (per Codex M recommendation: **defer**).

**No-go for auto-fix:**
- Deleting any orphan page (every recent page is "orphan" until next index pass).

## See also

- [[hot]] - current state snapshot.
- [[log]] - 2026-05-20 entry notes prior 171-link cleanup (this report shows additional drift since then).
- [[plans/architecture-pass-2]] - the DEC-11 in-flight plan.
