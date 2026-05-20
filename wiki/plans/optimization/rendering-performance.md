# Optimization — Rendering Performance

This document identifies concrete rendering optimizations for the [[Game|game engine]] based on deep code analysis.

---

## 🔴 Critical: Gradient Recreation Every Frame

**File:** `SkySystem.ts:194`  
**Issue:** `ctx.createLinearGradient()` is called **every single frame** in `draw()`.  
**Impact:** Gradient objects are allocated and GC'd at 60fps = 60 allocations/sec.

**Fix:** Cache the gradient and only recreate when the interpolated colors change:
```typescript
private cachedGrad: CanvasGradient | null = null;
private cachedTop: string = '';
private cachedBot: string = '';

draw(ctx, w, h) {
  const { top, bot } = this.getSkyColors(this.time);
  if (top !== this.cachedTop || bot !== this.cachedBot || !this.cachedGrad) {
    this.cachedGrad = ctx.createLinearGradient(0, 0, 0, h);
    this.cachedGrad.addColorStop(0, top);
    this.cachedGrad.addColorStop(1, bot);
    this.cachedTop = top;
    this.cachedBot = bot;
  }
  ctx.fillStyle = this.cachedGrad;
  ctx.fillRect(0, 0, w, h);
}
```

---

## 🔴 Critical: Color String Parsing Every Frame

**File:** `SkySystem.ts:254-280`  
**Issue:** `lerpColor()` parses hex/rgb strings with `parseInt` and regex **every frame**, 3× per call (top, bot, overlay). That's 6 string parses + 3 regex matches per frame.

**Fix:** Pre-parse all keyframe colors into `[r, g, b]` tuples at construction time. Then `lerpColor` becomes pure integer arithmetic with zero string parsing.

---

## 🟡 Medium: Cloud Rendering — No Visibility Culling

**File:** `SkySystem.ts:204-231`  
**Issue:** All 20 clouds are iterated and drawn every frame, even if off-screen.

**Fix:** Add bounds check: `if (cloudRight < 0 || cloudLeft > w) return;`

---

## 🟡 Medium: Landscape Double-Draw

**File:** `Landscape.ts:156-173`  
**Issue:** `Landscape.draw()` calls `super.draw()` **and** draws an additional `fillRect(w×2000)` every frame.

**Fix:** Include the ground-fill in the cached texture during `drawToCache()`.

---

## 🟢 Minor: rAF Closure Allocation

**File:** `Game.ts:163`  
**Issue:** `requestAnimationFrame((t) => this.loop(t))` creates a new closure every frame.

**Fix:** Use `this.boundLoop = this.loop.bind(this)` once in constructor.

---

## Summary

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 | Gradient recreation per frame | High | Low |
| 🔴 | Color string parsing per frame | High | Medium |
| 🟡 | Cloud culling missing | Medium | Low |
| 🟡 | Landscape double-draw | Medium | Medium |
| 🟢 | rAF closure allocation | Low | Low |

See also: [[SkySystem]], [[Game]], [[entity-caching]]
