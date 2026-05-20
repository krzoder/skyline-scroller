# Optimization — Procedural Generation

Optimization opportunities in the [[procgen|procedural generation]] pipeline.

---

## 🔴 Critical: `splice()` for Cloud Removal is O(n)

**File:** `SkySystem.ts:179`  
**Fix:** Use swap-and-pop pattern (cloud render order doesn't matter visually).

---

## 🔴 Critical: No Object Pooling for Entities

**Files:** `CityGenerator.ts`, `Building.ts`, `Tree.ts`  
**Issue:** Every chunk generates new objects with `document.createElement('canvas')`. Continuous allocation + GC pressure.

**Fix:** Implement an `EntityPool<T>` with `acquire()`/`release()`.

---

## 🟡 Medium: `pickTreeType()` Allocates Array Every Call

**File:** `CityGenerator.ts:181-193`

**Fix:** Cache available types per biome, rebuild only on biome change.

---

## 🟡 Medium: Fixed 500px Chunk Look-Ahead Buffer

**File:** `CityGenerator.ts:52`  
**Issue:** Background layers (speedModifier=0.2) over-generate chunks.

**Fix:** Scale buffer by `speedModifier`: `const buffer = 500 * layer.speedModifier;`

---

## Summary

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 | splice() O(n) cloud removal | Medium | Low |
| 🔴 | No entity pooling | High | High |
| 🟡 | Array alloc in pickTreeType | Low | Low |
| 🟡 | Fixed chunk look-ahead | Medium | Low |

See also: [[CityGenerator]], [[BiomeSystem]], [[Random]]
