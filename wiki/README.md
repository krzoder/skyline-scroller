---
name: Skyline Scroller Wiki
description: In-repo Obsidian knowledge base for the procedural skyline-scroller project. Pinned to the repo, lives in `wiki/`.
type: index
---

# Skyline Scroller — Wiki

Living, in-repo knowledge base. **Open this folder as an Obsidian vault** (`File → Open vault → Open folder as vault → wiki/`).

## How it is organised

| Folder | Purpose |
|---|---|
| `entities/` | One page per code unit (class, module, file). Mirrors `src/`. |
| `systems/` | Cross-file *behavioural* systems — game loop, parallax, terminal, sky, procgen, UI shell, entity rendering, CSS. |
| `concepts/` | Cross-cutting ideas — determinism, dualisms, control flow, chunking, time, parallax math. |
| `operations/` | How the project runs — build, deploy, dev loop, testing. |
| `decisions/` | Why things are the way they are — architectural choices and their reasons. |
| `maps/` | Graphs and tables — dependency graph, complexity heatmap, drift between old docs and current code. |
| `_templates/` | Page templates for new notes. |
| `.scan/` | Raw agent-scan outputs. Source-of-truth for the structured pages; keep around for re-folding. |
| `hot.md` | Current state snapshot — overwrite each substantive session. |
| `log.md` | Append-only chronological log of changes. New entries at the TOP. |
| `index.md` | Master table of contents. |

## Pinned status

This wiki **lives in the repo** under `wiki/`. Commit it with `wiki:` prefix when changing only wiki content.

## Reading order for a new contributor

1. [[index]] — full table of contents
2. [[hot]] — what the wiki currently knows
3. `systems/game-loop` → `systems/parallax-layers` → `systems/procgen` → `systems/sky` → `systems/terminal` → `systems/ui-shell`
4. `concepts/dualisms` and `concepts/determinism` for the design philosophy
5. `maps/dependencies` for the call graph

## Maintenance

- After a substantive change to `src/`, refresh the relevant `entities/` and `systems/` pages and append to `log.md`.
- `hot.md` is a rolling snapshot — overwrite, never append.
- `.scan/` raw agent outputs are kept so future agents can re-fold without re-reading source.

## Legacy

The old flat wiki at `skyline-scroller/skyline-scroller/` is **superseded** by this one. See [[maps/wiki-drift]] for the diff. It can be deleted once this wiki is approved.
