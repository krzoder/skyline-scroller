# Optimization — Architecture and Memory

Architectural and memory management optimizations across the [[Game|game engine]].

---

## 🔴 Critical: DOM Access in the Game Loop

**File:** `Game.ts:182-207`  
**Issue:** `document.getElementById()` called **every frame** for `ui-seed-val` and `ui-time-val`.

**Fix:** Cache DOM references once in constructor.

---

## 🔴 Critical: `JSON.parse(JSON.stringify())` for Deep Clone

**File:** `Game.ts:41`, `CityGenerator.ts:30-32`  
**Issue:** Slow deep clone. Called on every `reset()`.

**Fix:** Use `structuredClone()` (native) or typed shallow clone.

---

## 🔴 Critical: `Math.random()` Breaks Determinism

**Files:** `Building.ts:74,79`, `Landscape.ts:38,92`  
**Issue:** Non-seeded random in procedural generation defeats [[determinism|deterministic seeding]].

**Fix:** Thread the `Random` instance into all entity constructors.

---

## 🟡 Medium: `Array.filter()` Creates New Array Every Frame

**File:** `Layer.ts:33`  
**Issue:** `prune()` allocates a new array per call (4 layers × every frame).

**Fix:** In-place write-pointer compaction.

---

## 🟡 Medium: `forEach` Closures in Hot Paths

**Files:** `Game.ts:179,231`, `Layer.ts:61`  
**Issue:** Arrow function closures in render/update loops.

**Fix:** Replace with indexed `for` loops.

---

## 🟡 Medium: `console.log` in Production

**Files:** `Game.ts:42,142,274,284`, `CityGenerator.ts:42`

**Fix:** Remove or gate behind `import.meta.env.DEV`.

---

## 🟡 Medium: `any` Type Usage

**File:** `CityGenerator.ts:120`  
**Issue:** `let obj: any = null`

**Fix:** Use `Renderable | null`.

---

## Summary

| Priority | Issue | Category | Effort |
|----------|-------|----------|--------|
| 🔴 | DOM access in game loop | Perf | Low |
| 🔴 | JSON.parse deep clone | Perf | Low |
| 🔴 | Math.random() breaks determinism | Correctness | Medium |
| 🟡 | Array.filter() per frame | GC | Low |
| 🟡 | forEach closures | Perf | Low |
| 🟡 | console.log in production | Cleanup | Low |
| 🟡 | `any` type | Type Safety | Low |

See also: [[Game]], [[Random]], [[determinism]]
