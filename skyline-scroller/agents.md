# AI Agent Swarm — Skyline Scroller Knowledge Base

This document describes the multi-agent AI architecture used to analyze, document, and verify the entire `skyline-scroller` codebase. The Knowledge Base you see in this Obsidian vault was generated autonomously by a swarm of specialized AI agents, each with a distinct role and expertise.

---

## Orchestrator

**Name:** Antigravity (Main Agent)  
**Model:** Gemini 3.1 Pro → Claude Opus 4.6 (fallback on rate limit)  
**Role:** Central coordinator. Defines subagent architectures, manages execution order, handles rate-limit recovery, and synthesizes final deliverables.

**Responsibilities:**
- Designed the swarm topology (4 Writers + 1 Reviewer).
- Staggered agent launches to avoid API rate limits (429 errors).
- Installed Obsidian and configured the vault with the Local REST API plugin.
- Created CI/CD pipelines, tests, and this meta-document.

---

## Writer Agents (The Generators)

### 1. Core Systems Writer
**Specialization:** Application state management, game loops, and layering architecture.  
**Files Analyzed:**
- `src/main.ts`
- `src/engine/Game.ts`
- `src/engine/Layer.ts`
- `src/engine/Renderable.ts`

**Documents Produced:**
- [[Engine_Architecture]]
- [[Game_Loop_and_Time]]
- [[State_Management]]
- [[Layering_System]]
- [[UI_and_Configuration]]

---

### 2. Graphics Pipeline Writer
**Specialization:** Canvas rendering, visual effects, and entity caching.  
**Files Analyzed:**
- `src/engine/SkySystem.ts`
- `src/engine/Landscape.ts`
- `src/engine/Building.ts`
- `src/engine/Tree.ts`

**Documents Produced:**
- [[Graphics Pipeline Overview]]
- [[Entity Caching System]]
- [[Sky Gradients]]
- [[Celestial Bodies]]
- [[Procedural Generation of Buildings]]
- [[Procedural Generation of Flora]]
- [[Landscape Generation]]

---

### 3. Procedural Generation Writer
**Specialization:** Deterministic generation algorithms, biome systems, and chunk-based world construction.  
**Files Analyzed:**
- `src/procgen/CityGenerator.ts`
- `src/procgen/BiomeSystem.ts`
- `src/utils/Random.ts`

**Documents Produced:**
- [[Deterministic Randomness]]
- [[Biome System]]
- [[Biome Transitions]]
- [[City Generation]]
- [[Chunk System]]
- [[Procedural Generation Overview]]

---

### 4. Infrastructure & UI Writer
**Specialization:** Terminal emulation, CSS architecture, build tooling, and CI/CD pipelines.  
**Files Analyzed:**
- `src/engine/Terminal.ts`
- `src/style.css`
- `package.json`
- `.github/workflows/`

**Documents Produced:**
- [[Terminal Overview]]
- [[Terminal Autocomplete Engine]]
- [[Terminal Grammar State Machine]]
- [[CSS Architecture]]
- [[UI Architecture Overview]]
- [[Build and Deploy Pipeline]]

---

## Reviewer Agent (The Verifier)

**Name:** Documentation Reviewer  
**Role:** Cross-model verification. Reads all generated Markdown files and compares claims against the actual TypeScript source code. Corrects hallucinations, fixes broken WikiLinks, and adds missing technical details.

**Status:** Initial Gemini instance hit rate limits (429). Verification was completed manually by the Orchestrator running on Claude Opus 4.6, acting as the "different model" for cross-verification.

---

## Execution Timeline

| Time       | Event                                          |
|------------|-------------------------------------------------|
| 23:09      | Obsidian installed via `winget`                 |
| 23:10      | Vault directory created at `docs/knowledge_base`|
| 23:10      | First swarm attempt (all 4 agents) → 429 errors |
| 23:12      | Staggered launch strategy adopted               |
| 23:13      | Local REST API plugin installed into vault       |
| 23:25      | Plan approved, second swarm deployed             |
| 23:26      | Core Systems Writer launched                     |
| 23:27      | Core Systems Writer completed (4 docs)           |
| 23:27      | Graphics Pipeline Writer launched                |
| 23:29      | Graphics Pipeline Writer completed (7 docs)      |
| 23:29      | Procedural Generation Writer launched            |
| 23:30      | Procedural Generation Writer completed (5 docs)  |
| 23:30      | Infrastructure & UI Writer launched              |
| 23:32      | Infrastructure & UI Writer completed (3 docs)    |
| 23:32      | Documentation Reviewer launched → 429 error      |
| 23:41      | Manual review by Orchestrator (Claude Opus 4.6)  |
| 23:42      | Tests created (`vitest`), CI/CD updated          |
| 23:43      | `agents.md` synthesized                          |

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│                  ORCHESTRATOR                        │
│              (Antigravity Agent)                     │
│                                                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐│
│  │  Core   │  │Graphics │  │ ProcGen │  │  Infra  ││
│  │ Writer  │  │ Writer  │  │ Writer  │  │ Writer  ││
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘│
│       │            │            │            │      │
│       ▼            ▼            ▼            ▼      │
│  ┌──────────────────────────────────────────────┐   │
│  │          Obsidian Vault (Markdown)            │   │
│  │     docs/knowledge_base/ → WikiLinks         │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                                │
│                     ▼                                │
│            ┌────────────────┐                        │
│            │   Reviewer     │                        │
│            │  (Verifier)    │                        │
│            └────────────────┘                        │
└──────────────────────────────────────────────────────┘
```

---

## Obsidian Integration

- **Vault Location:** `skyline-scroller/skyline-scroller/` (active vault)
- **Plugin:** `obsidian-local-rest-api` — Provides a REST API on `https://127.0.0.1:27124` for programmatic access to the vault.
- **Graph View:** All documents are interconnected via `[[WikiLinks]]`, creating a navigable knowledge graph visible in Obsidian's Graph View.

---

## Stats

- **Total Documents Generated:** 27 Markdown files
- **Total Agents Used:** 6 (1 Orchestrator + 4 Writers + 1 Reviewer)
- **Models Used:** Gemini 3.1 Pro, Claude Opus 4.6
- **Tests Written:** 8 (covering `Random.ts` PRNG)
- **Workflows Created:** 3 (`ci.yml`, `deploy.yml`, `pr-preview.yml`)
