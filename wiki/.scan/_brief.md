# Swarm scan brief

Each agent owns ONE numbered file in this folder (`agent-NN-*.md`). Agents:

- Read only files they need.
- Write a single structured markdown report.
- Use the canonical headings below so the synthesis step can merge them.
- Cross-link by future wiki paths, e.g. `[[entities/Game]]` even before the page exists.

## Canonical headings per agent report

```
# Agent NN — <scope>

## Files scanned
## Public surface (exports/classes/functions/types)
## Internal state
## Control flow
## Dependencies (imports / imported-by, even if known indirectly)
## Complexity & hotspots
## Dualisms & duality patterns observed
## Invariants
## Surprises / risks / TODOs
## Suggested wiki pages
```

The dualism heading is required for every agent — even a "no dualisms here" answer is valuable.
