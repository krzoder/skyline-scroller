# Optimization — UX and Bundle

UX, bundle delivery, and frontend optimization opportunities.

---

## 🟡 Medium: Canvas Resize Not Debounced

**File:** `Game.ts:133-136`  
**Fix:** Debounce with `setTimeout(..., 100)`.

---

## 🟡 Medium: No Loading State

**Fix:** CSS gradient background on canvas:
```css
#game-canvas { background: linear-gradient(to bottom, #020024, #090979); }
```

---

## 🟡 Medium: No PWA Support

**Fix:** Add `manifest.json` + service worker for offline + install.

---

## 🟢 Minor: Accessibility

**Fix:** Add `aria-label` on interactive elements, keyboard focus management.

---

## Summary

| Priority | Issue | Effort |
|----------|-------|--------|
| 🟡 | Resize debounce | Low |
| 🟡 | Loading state | Low |
| 🟡 | PWA support | Medium |
| 🟢 | Accessibility | Medium |

See also: [[css-architecture]], [[terminal]], [[ui-shell]]
