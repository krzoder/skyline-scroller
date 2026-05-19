---
id: DEC-05
title: Low-code config registry — declarative biomes, design tokens, version sync, workflow hardening
type: decision
status: proposed
date: 2026-05-20
supersedes: []
superseded-by: []
tags: [config, registry, biomes, regions, design-tokens, vite, version, ci, workflows, low-code, api]
related:
  - "[[entities/BiomeSystem]]"
  - "[[entities/TreeConfig]]"
  - "[[entities/CityGenerator]]"
  - "[[entities/SkySystem]]"
  - "[[entities/Building]]"
  - "[[systems/procgen]]"
  - "[[systems/sky]]"
  - "[[systems/css-architecture]]"
  - "[[operations/build-deploy]]"
  - "[[concepts/determinism]]"
---

# DEC-05 — Low-code config registry, declarative biomes, design tokens, version sync, workflow hardening

## Problem

The codebase has matured into beta-1.1.x but still treats *configuration* the same way it treated it on day one: every knob is an inline literal at the point of use. Five separate failure modes follow from this, and the user goal — **"create globals/regions/etc. easily expandable and modifiable with API"** — is unreachable without consolidating them.

1. **Magic numbers and color literals scattered across `src/engine/`.** A grep for `fillStyle` across `Building.ts`, `Tree.ts`, `Ground.ts`, `Landscape.ts` returns 23 distinct hex/rgba literals. The sky alone (`SkySystem.ts:9–25`) contains 17 keyframes × 3 color channels = 51 inline color strings. There is no single place where a designer or LLM-agent can list "the palette of this game"; mutating a color requires a code search.
2. **Biomes are defined imperatively in code, not declaratively in data.** `BiomeSystem.ts:11–17` hard-codes the adjacency graph; `CityGenerator.ts:196–231` hard-codes per-biome material/roof/color selection rules inside three `pickX(biome)` switch ladders. Adding a sixth biome (e.g. `swamp`) requires touching at minimum `BiomeType` (union), `BiomeSystem.transitions`, `TreeConfig.DEFAULT_TREE_CONFIG.biomes[]` (per tree), `CityGenerator.pickMaterial/pickRoof/pickColor`, plus any UI dropdowns. There is no single registration site.
3. **No `vite.config.ts`.** Base-path lives in CLI flags inside `.github/workflows/ci.yml:48`, `deploy.yml:35`, `pr-preview.yml:35`. The local dev `npm run build` therefore produces an artefact with `base=/` while production produces `base=/skyline-scroller/`; the two are not equivalent and the discrepancy is invisible to a developer running `npm run preview` locally. There is no place to register Vite plugins, aliases, or `define` constants.
4. **Version drift.** `package.json:4` says `"1.0.0-beta"`. The most recent commit messages mention `1.1.2`. Nothing in `src/` knows its own version, so the seed-display / about pane (if added) has no source of truth. CI artefacts are not stamped.
5. **CSS has no design tokens and contains broken declarations.** `style.css:330` uses the long-deprecated `writing-mode: bt-lr` and `-webkit-appearance: slider-vertical`, both removed from Chromium since 2021. The vertical volume slider is broken in every modern browser. z-index values are assigned ad-hoc — `ui-layer:10`, `bottom-right-controls:100`, `terminal-output-container:150`, `terminal-bar:150` (collision), `volume-popup:200`, `custom-gen-window:200` (collision), `advanced-window:300`, `gesture-slider-container:500`, `volume-visual-container:9999`. Two pairs collide; the ladder is unprincipled.
6. **Workflows duplicate setup.** `ci.yml`, `deploy.yml`, `pr-preview.yml` each repeat `checkout → setup-node@v4 (node 22, cache npm) → npm ci`. `deploy.yml` has `cancel-in-progress: false` (correct for prod), but no production lint job exists, no actions are pinned to commit SHAs, and the `--base=` flag is duplicated three times — change the repo name and you must edit three files.

See [[systems/procgen]], [[systems/sky]], [[systems/css-architecture]], [[operations/build-deploy]] for the systems each problem touches.

## Constraints

- **Determinism must survive.** Any change to procgen must produce **byte-identical** output for the same seed. The Random draw order in `BiomeSystem.constructor`, `BiomeSystem.switchBiome`, and `CityGenerator.addChunk` is load-bearing for [[concepts/determinism]] — every existing seed in the wild is a contract. The acceptance test is a golden-image diff against pre-DEC-05 output.
- **No runtime fetch by default.** Region definitions are imported as static ES modules. The build output stays a single self-contained bundle (no `fetch('/regions/forest.json')`). This is option **A** (module-static) from the design discussion. A later DEC may opt into option B (runtime-loaded JSON) for mod support, but not in this decision.
- **Pure Canvas API artefact.** No new runtime dependencies. Vite stays as the only build tool; no PostCSS, no css-modules, no JSON5. The `:root { --c-* }` token block uses plain CSS custom properties — already supported in every target browser.
- **No new dev dependencies unless they replace something.** A lint job is desirable but `npx tsc --noEmit` already catches the bulk of issues. We add **`oxlint`** only if it can be a zero-config single-binary install; otherwise we double down on `tsc --noEmit` plus a custom `scripts/check-tokens.mjs`.
- **Backwards-compatible `BiomeSystem` public API.** Anything that imports `BiomeType` or calls `getCurrentBiome()`, `forceBiome()`, `update()` must keep working unchanged. The registry is internal.
- **`package.json` remains the single source of version truth.** A `version.ts` constant is *derived* from it via Vite's `define`, not hand-edited.

## Decision

Introduce a `src/config/` directory holding cross-cutting constants, a `src/regions/` directory holding declarative biome definitions, a root `vite.config.ts`, a `:root` token block in `style.css`, and a hardened workflow set with one shared composite action.

### 1. `src/config/` — config registry (barrel)

```
src/config/
├── index.ts        # barrel re-export
├── colors.ts       # every hex used in engine + style.css, named
├── timing.ts       # day-length, biome-duration, sky-speed, frame-budget
├── parallax.ts     # the 4 layer configs (speedModifier, z, yOffset, scale)
└── version.ts      # VERSION constant, populated by Vite define
```

**`src/config/index.ts`** is a thin barrel:

```ts
export * from './colors';
export * from './timing';
export * from './parallax';
export * from './version';
```

#### `src/config/colors.ts` — palette extraction

Every literal currently inlined in `src/engine/*.ts` is hoisted here as a named constant. Engine code becomes `ctx.fillStyle = COLORS.tree.bark.oak` instead of `ctx.fillStyle = '#6D4C41'`. The same constants are referenced by `:root` CSS variables (see §5) so the canvas world and the DOM chrome share one palette.

Reference table (subset shown; full list ~40 entries):

| name | hex | used by |
|---|---|---|
| `COLORS.tree.bark.sequoia` | `#5D4037` | `Tree.ts:107` |
| `COLORS.tree.bark.pine` | `#4E342E` | `Tree.ts:82` |
| `COLORS.tree.bark.oak` | `#6D4C41` | `Tree.ts:61` |
| `COLORS.tree.leaves.oak` | `#2E7D32` | `Tree.ts:67`, also `style.css:398` (`.btn-selected`) |
| `COLORS.tree.leaves.pine` | `#1B5E20` | `Tree.ts:86` |
| `COLORS.tree.leaves.sequoia` | `#43A047` | `Tree.ts:111` |
| `COLORS.tree.bush` | `#7CB342` | `Tree.ts:134` |
| `COLORS.tree.cactus` | `#2E7D32` | `Tree.ts:143` |
| `COLORS.tree.flower` | `#E91E63` | `Tree.ts:170` |
| `COLORS.tree.hedge` | `#558B2F` | `Tree.ts:178` |
| `COLORS.tree.hedgeStroke` | `#33691E` | `Tree.ts:183` |
| `COLORS.ground.grass` | `#4CAF50` | `Ground.ts:26` |
| `COLORS.ground.grassDark` | `#388E3C` | `Ground.ts:29` |
| `COLORS.ground.pavement` | `#9E9E9E` | `Ground.ts:33` |
| `COLORS.ground.pavementMark` | `#FFFFFF` | `Ground.ts:35` |
| `COLORS.ground.water` | `#2196F3` | `Ground.ts:39` |
| `COLORS.ground.waterFoam` | `#BBDEFB` | `Ground.ts:41` |
| `COLORS.ground.dirt` | `#795548` | `Ground.ts:46` |
| `COLORS.building.windowLit` | `#FDF5E6` | `Building.ts:73` |
| `COLORS.building.windowDay` | `#87CEEB` | `Building.ts:74` |
| `COLORS.sky.sun` | `#FFD700` | `SkySystem.ts:384` |
| `COLORS.sky.moon` | `#FEFCD7` | `SkySystem.ts:390` |
| `COLORS.sky.moonCrater` | `#E0E0E0` | `SkySystem.ts:394` |
| `COLORS.ui.panelBg` | `rgba(20,20,20,0.95)` | `style.css:102`,`139` |
| `COLORS.ui.panelBorder` | `rgba(255,255,255,0.1)` | `style.css:103`,`140` |
| `COLORS.ui.controlBg` | `rgba(0,0,0,0.7)` | `style.css:81` |
| `COLORS.ui.terminalText` | `#0f0` | `style.css:225`,`277` |
| `COLORS.ui.terminalBorder` | `#336` | `style.css:225`,`277` |
| `COLORS.ui.resetDefault` | `#FBC02D` | `style.css:419` |
| `COLORS.ui.resetModified` | `#d32f2f` | `style.css:425` |

Shape:

```ts
export const COLORS = {
    tree: {
        bark:   { sequoia: '#5D4037', pine: '#4E342E', oak: '#6D4C41' },
        leaves: { sequoia: '#43A047', pine: '#1B5E20', oak: '#2E7D32' },
        bush:   '#7CB342',
        cactus: '#2E7D32',
        flower: '#E91E63',
        hedge:  '#558B2F',
        hedgeStroke: '#33691E',
    },
    ground: {
        grass: '#4CAF50', grassDark: '#388E3C',
        pavement: '#9E9E9E', pavementMark: '#FFFFFF',
        water: '#2196F3', waterFoam: '#BBDEFB',
        dirt: '#795548',
    },
    building: {
        windowLit: '#FDF5E6',
        windowDay: '#87CEEB',
        stoneNoise: 'rgba(0,0,0,0.1)',
    },
    sky: {
        sun: '#FFD700',
        moon: '#FEFCD7',
        moonCrater: '#E0E0E0',
        // keyframes moved here from SkySystem.ts; SkySystem imports COLORS.sky.keyframes
        keyframes: [/* ...the 17 entries currently inline at SkySystem.ts:9-25... */],
    },
    ui: {
        panelBg: 'rgba(20,20,20,0.95)',
        panelBorder: 'rgba(255,255,255,0.1)',
        controlBg: 'rgba(0,0,0,0.7)',
        terminalText: '#0f0',
        terminalBorder: '#336',
        resetDefault: '#FBC02D',
        resetModified: '#d32f2f',
        accentGreen: '#2E7D32',
        accentGreenLight: '#4CAF50',
    },
} as const;
```

`as const` gives literal types so a typo in `COLORS.tree.bark.spruce` is a TS error.

#### `src/config/timing.ts`

```ts
// Day / sky
export const DAY_HOURS = 24;
export const SECONDS_PER_DAY = 240;          // wall-clock seconds per in-world day
export const SKY_TIME_SCALE = 0.1;           // SkySystem.speed (currently SkySystem.ts:6)

// Biome streaming
export const BIOME_MIN_DURATION = 3000;      // pixels — BiomeSystem.ts:24,39
export const BIOME_MAX_DURATION = 8000;
export const BIOME_FORCE_DURATION = 8000;    // BiomeSystem.forceBiome — .ts:49

// Sun/moon animation windows (SkySystem.ts:294-296)
export const CELESTIAL_FLIP_WIN = 0.15;
export const CELESTIAL_RAY_WIN  = 0.5;

// Cloud spawn
export const CLOUD_COUNT = 20;               // SkySystem.ts:49
export const CLOUD_APPROX_INIT_WIDTH = 1920; // SkySystem.ts:51
```

#### `src/config/parallax.ts`

Extracts the four layers currently constructed inline at `Game.ts:111-114`:

```ts
export interface ParallaxLayerConfig {
    speedModifier: number;  // 0..1 (1 = foreground, parallax ratio)
    zIndex: number;         // draw order (0 = back, 3 = front)
    yOffset: number;        // upward translate; positive = higher on screen
    scale: number;          // optional uniform scale; default 1
}

export const PARALLAX_LAYERS: ReadonlyArray<ParallaxLayerConfig> = [
    { speedModifier: 0.2, zIndex: 0, yOffset: 190, scale: 1.3 }, // Background
    { speedModifier: 0.4, zIndex: 1, yOffset: 100, scale: 1.0 }, // Mid-Back
    { speedModifier: 0.6, zIndex: 2, yOffset: 50,  scale: 1.0 }, // Mid-Fore
    { speedModifier: 1.0, zIndex: 3, yOffset: 0,   scale: 1.0 }, // Foreground
] as const;
```

`Game.reset()` becomes:

```ts
this.layers = PARALLAX_LAYERS.map(c => new Layer(c.speedModifier, c.zIndex, c.yOffset, c.scale));
```

#### `src/config/version.ts`

```ts
// Injected by vite.config.ts `define`. See PACKAGE_VERSION block.
declare const __PACKAGE_VERSION__: string;
export const VERSION: string = __PACKAGE_VERSION__;
```

The Vite `define` reads `package.json` at build time and injects the literal string — see §4.

### 2. `src/regions/` — declarative biomes

One file per biome, each exporting a `BiomeDefinition`. The registry replaces the hand-coded tables in `BiomeSystem.ts` and the `pickMaterial/pickRoof/pickColor` switches in `CityGenerator.ts`.

#### `BiomeDefinition` interface (~12 fields)

```ts
// src/regions/types.ts
import type { TreeType } from '../engine/Tree';
import type { BuildingMaterial, RoofType } from '../engine/Building';
import type { GroundType } from '../engine/Ground';

export interface BiomeDefinition {
    /** Unique key. Also the `BiomeType` discriminant. */
    id: string;
    /** Human label for UI / terminal autocomplete. */
    label: string;

    /** Streaming duration window in pixels. */
    durationRange: readonly [min: number, max: number];

    /** Adjacency: which biomes this one can transition INTO. */
    transitionsTo: readonly string[];

    /** Tree types that may spawn here. Subset of TreeType. */
    treeSpecies: readonly TreeType[];

    /** Material picker — weighted list, RNG draws uniformly. */
    buildingMaterials: ReadonlyArray<{ material: BuildingMaterial; weight: number }>;

    /** Roof picker — same shape. */
    roofTypes: ReadonlyArray<{ roof: RoofType; weight: number }>;

    /** Building palette in HSL ranges (CityGenerator.pickColor). */
    buildingPalette: {
        hue: readonly [number, number];
        saturation: number;
        lightness: number;
    };

    /** Ground type for non-foreground layers. */
    backgroundGround: GroundType;

    /** Optional overlay tint applied to sky during this biome. */
    skyTint?: string;

    /** Optional debug color for map view. */
    debugColor?: string;
}
```

#### `src/regions/forest.ts` — full reference template

```ts
import type { BiomeDefinition } from './types';

export const forest: BiomeDefinition = {
    id: 'forest',
    label: 'Forest',
    durationRange: [3000, 8000],
    transitionsTo: ['tundra', 'plains'],
    treeSpecies: ['sequoia', 'pine', 'oak', 'bush'],
    buildingMaterials: [
        { material: 'wood',  weight: 0.5 },
        { material: 'stone', weight: 0.5 },
    ],
    roofTypes: [
        { roof: 'gabled', weight: 1.0 },
    ],
    buildingPalette: {
        hue: [90, 150],   // green-ish
        saturation: 50,
        lightness: 50,
    },
    backgroundGround: 'grass',
    debugColor: '#2E7D32',
};
```

The other four files (`desert.ts`, `tundra.ts`, `plains.ts`, `city.ts`) follow the same shape. Their content is mechanically derived from the existing `pickMaterial/pickRoof/pickColor` ladders in `CityGenerator.ts:196-231`.

#### `src/regions/_index.ts` — registry

```ts
import type { BiomeDefinition } from './types';
import { forest }  from './forest';
import { desert }  from './desert';
import { tundra }  from './tundra';
import { plains }  from './plains';
import { city }    from './city';

export const REGIONS: Readonly<Record<string, BiomeDefinition>> = {
    forest, desert, tundra, plains, city,
} as const;

export const REGION_IDS = Object.keys(REGIONS) as ReadonlyArray<keyof typeof REGIONS>;
export type BiomeType = keyof typeof REGIONS;

export function getRegion(id: BiomeType): BiomeDefinition {
    const r = REGIONS[id];
    if (!r) throw new Error(`Unknown biome: ${id}`);
    return r;
}
```

`BiomeType` is now *derived* from the registry, not hand-typed. Adding a sixth biome (`swamp`) means: create `src/regions/swamp.ts`, add one import + one entry to `_index.ts`. **Nothing else changes.** This is the "modifiable with API" surface.

#### Minimal `BiomeSystem` rewrite

```ts
// src/procgen/BiomeSystem.ts — REWRITTEN
import { Random } from '../utils/Random';
import { REGIONS, REGION_IDS, getRegion, type BiomeType } from '../regions/_index';

export type { BiomeType };

export class BiomeSystem {
    private rng: Random;
    private currentBiome: BiomeType;
    private durationRemaining: number;

    constructor(seed: number | string) {
        this.rng = new Random(seed);
        // DETERMINISM: preserve exact draw order from the legacy implementation.
        // 1) pick initial biome from full list (REGION_IDS order MUST match the
        //    legacy ['forest','desert','tundra','plains','city'] order at .ts:22).
        // 2) pick initial duration from [3000, 8000].
        this.currentBiome = REGION_IDS[this.rng.nextInt(0, REGION_IDS.length)];
        this.durationRemaining = this.rng.nextInt(3000, 8000);
        console.log(`Initial Biome: ${this.currentBiome}`);
    }

    public update(dx: number): BiomeType {
        this.durationRemaining -= dx;
        if (this.durationRemaining <= 0) this.switchBiome();
        return this.currentBiome;
    }

    private switchBiome() {
        const def = getRegion(this.currentBiome);
        const options = def.transitionsTo as ReadonlyArray<BiomeType>;
        this.currentBiome = options[this.rng.nextInt(0, options.length)];
        const [min, max] = def.durationRange;
        this.durationRemaining = this.rng.nextInt(min, max);
        console.log(`Biome switched to: ${this.currentBiome}`);
    }

    public getCurrentBiome(): BiomeType { return this.currentBiome; }
    public forceBiome(b: BiomeType) {
        this.currentBiome = b;
        this.durationRemaining = getRegion(b).durationRange[1];
    }
}
```

`CityGenerator.pickMaterial/pickRoof/pickColor` are rewritten to consume the registry — they become 5-line weighted-uniform draws over `def.buildingMaterials`, `def.roofTypes`, `def.buildingPalette` instead of hard-coded `if (biome === 'desert')` chains. Critically, **the RNG draw count per chunk must stay identical** (one `nextFloat()` for material, one for roof, three for color). The implementation comment is explicit about this.

#### API surface — "modifiable with API"

| What you want to do | What you change |
|---|---|
| Add a new biome | Drop `src/regions/swamp.ts`; add import + entry to `_index.ts`. |
| Tweak biome adjacency | Edit `transitionsTo` in that biome's file. |
| Change building palette for desert | Edit `desert.ts` `buildingPalette.hue`. |
| Disable a tree species in a biome | Remove it from `treeSpecies`. |
| Change biome streaming duration | Edit `durationRange` per-biome (was global). |
| Replace a color globally | Edit `src/config/colors.ts`; `--c-*` CSS tokens follow. |
| Change parallax depth | Edit `src/config/parallax.ts`. |
| Change day length | Edit `src/config/timing.ts`. |

No engine file is touched. This is the low-code path the user asked for.

### 3. `vite.config.ts` — root config

Currently absent. Introduce at repo root:

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
    readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
);

export default defineConfig({
    base: process.env.PUBLIC_BASE_PATH ?? '/',
    define: {
        __PACKAGE_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        target: 'es2022',
        sourcemap: true,
    },
});
```

Workflows pass `PUBLIC_BASE_PATH=/skyline-scroller/` (or the PR-preview path) via `env:`; local `npm run build` produces a `base=/` artefact that works under `npm run preview` without further flags. The single source of base-path truth is now an env-var name, not a CLI flag duplicated three times. See [[operations/build-deploy]].

### 4. Version sync — `package.json` is canonical

- Bump `package.json` to `"version": "1.1.2"` (matches commit `504981a Beta 1.1.2 gen`).
- `vite.config.ts` `define.__PACKAGE_VERSION__` injects it at build time.
- `src/config/version.ts` re-exports as `VERSION`.
- A future "About" pane, the seed-display, the terminal `version` command, and CI artefact filenames all read `VERSION`.
- No prebuild script needed. No JSON-in-source-code. One write, three consumers.

Add a CI guard step that compares `package.json` version against the latest git tag (`gh release list --limit 1`) and warns if drift > one patch. Optional, can ship later.

### 5. CSS tokens + slider fix + z-index ladder

#### `:root` token block (top of `style.css`)

```css
:root {
    /* Typography */
    font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    color-scheme: light dark;

    /* Surfaces */
    --c-bg-app:         #242424;
    --c-bg-panel:       rgba(20, 20, 20, 0.95);
    --c-bg-control:     rgba(0, 0, 0, 0.7);
    --c-bg-control-hover: rgba(255, 255, 255, 0.1);
    --c-bg-terminal:    rgba(0, 0, 0, 0.85);
    --c-bg-terminal-hover: rgba(255, 255, 255, 0.1);
    --c-bg-overlay:     rgba(0, 0, 0, 0.5);

    /* Borders */
    --c-border-panel:   rgba(255, 255, 255, 0.1);
    --c-border-terminal: #336;
    --c-border-button:  #555;

    /* Text */
    --c-text-primary:   rgba(255, 255, 255, 0.87);
    --c-text-terminal:  #0f0;

    /* Accents (mirror src/config/colors.ts COLORS.ui) */
    --c-accent-green:       #2E7D32;
    --c-accent-green-light: #4CAF50;
    --c-accent-yellow:      #FBC02D;
    --c-accent-red:         #d32f2f;
    --c-accent-copied:      rgba(0, 255, 0, 0.4);

    /* Sliders */
    --c-slider-track:   #444;
    --c-slider-fill:    #2E7D32;
    --c-slider-thumb:   #fff;
    --c-slider-thumb-border: #333;

    /* z-index ladder — single source of truth */
    --z-ui-base:        100;  /* #ui-layer was 10; promoted */
    --z-bottom-right:   200;  /* #bottom-right-controls */
    --z-popup:          300;  /* #volume-popup */
    --z-window:         400;  /* #custom-gen-window, #settings-window */
    --z-window-modal:   500;  /* #advanced-window (above others) */
    --z-terminal:       600;  /* #terminal-bar, #terminal-output-container */
    --z-gesture:        700;  /* #gesture-slider-container */
    --z-toast:          9999; /* #volume-visual-container */
}
```

All existing color/z-index literals in `style.css` are replaced with `var(--c-*)` / `var(--z-*)`. The new ladder removes the two collisions (`terminal-bar` vs `terminal-output-container` at 150, `custom-gen-window` vs `volume-popup` at 200) by giving each surface class its own decade.

#### Vertical volume slider — broken declaration fix

Current (`style.css:329-338`) uses two removed properties:

```css
/* BROKEN — both removed from Chromium */
#volume-slider {
    writing-mode: bt-lr;                 /* deprecated 2018, removed */
    -webkit-appearance: slider-vertical; /* removed Chrome 125 (2024) */
    appearance: slider-vertical;         /* never standardised */
    width: 8px; height: 120px;
}
```

Replace with a rotated-container pattern that works in every current browser:

```css
.volume-slider-rotated {
    /* Hosts a horizontal range input, rotated -90deg.
       Width/height swap, mouse axis is the visible vertical. */
    width: 120px;
    height: 8px;
    transform: rotate(-90deg);
    transform-origin: center;
    margin: 56px 0;  /* compensate for rotation taking horizontal space */
}

.volume-slider-rotated input[type=range] {
    width: 100%;
    height: 100%;
    accent-color: var(--c-accent-green);
}

/* Progressive enhancement: keep writing-mode for forward-compat browsers */
@supports (writing-mode: vertical-lr) {
    #volume-slider {
        writing-mode: vertical-lr;
        direction: rtl;             /* makes "up" = max */
        width: 8px;
        height: 120px;
        transform: none;
    }
}
```

The HTML in `index.html` gets a wrapper:

```html
<div class="volume-slider-rotated">
    <input type="range" id="volume-slider" min="0" max="100" value="50">
</div>
```

#### Other CSS cleanup folded in

- `body, html` background uses `var(--c-bg-app)`.
- All `rgba(20,20,20,0.95)` → `var(--c-bg-panel)`.
- All `#0f0` → `var(--c-text-terminal)`.
- `.btn-selected` green tokens.
- `.btn-smart-reset.default` / `.modified` use accent vars.

### 6. Workflow hardening

Three workflows currently duplicate `checkout → setup-node@v4 → npm ci`. Consolidate via a **composite action** (simplest, no new external dep, lives in the repo):

#### `.github/actions/setup/action.yml`

```yaml
name: Setup Node + Install
description: Checkout, set up Node 22, npm ci. Used by every job.
runs:
    using: composite
    steps:
        - name: Setup Node.js
          uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4.0.2
          with:
              node-version: 22
              cache: npm
        - name: Install dependencies
          shell: bash
          run: npm ci
```

(Each workflow still does `actions/checkout@…` first because composite actions can't run before checkout when they themselves need the repo state — keep checkout inline.)

#### `.github/workflows/ci.yml` (rewritten)

```yaml
name: CI

on:
    push:
        branches: [main]
    pull_request:
        branches: [main]

concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true

jobs:
    lint:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
            - uses: ./.github/actions/setup
            - name: Type check (lint mode)
              run: npx tsc --noEmit

    test:
        needs: lint
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
            - uses: ./.github/actions/setup
            - name: Run tests
              run: npm test

    build:
        needs: test
        runs-on: ubuntu-latest
        env:
            PUBLIC_BASE_PATH: /skyline-scroller/
        steps:
            - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
            - uses: ./.github/actions/setup
            - name: Build
              run: npm run build
            - name: Upload build artefact
              uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08 # v4.6.0
              with:
                  name: dist-${{ github.sha }}
                  path: dist
                  retention-days: 7
```

#### `.github/workflows/deploy.yml` (rewritten)

```yaml
name: Deploy to GitHub Pages

on:
    push:
        branches: [main]
    workflow_dispatch:

permissions:
    contents: write

concurrency:
    group: pages
    cancel-in-progress: true   # was false; we want latest main to win

jobs:
    deploy:
        runs-on: ubuntu-latest
        env:
            PUBLIC_BASE_PATH: /skyline-scroller/
        steps:
            - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
            - uses: ./.github/actions/setup
            - name: Type check
              run: npx tsc --noEmit
            - name: Run tests
              run: npm test
            - name: Build
              run: npm run build
            - name: Deploy to GitHub Pages
              uses: peaceiris/actions-gh-pages@4f9cc6602d3f66b9c108549d475ec49e8ef4d45e # v4.0.0
              with:
                  github_token: ${{ secrets.GITHUB_TOKEN }}
                  publish_dir: ./dist
                  keep_files: true
```

Cancel-in-progress flipped to `true`: if a new commit lands on `main` during a deploy, the older deploy is cancelled and the newer one wins. The previous `false` setting meant a long-running deploy would queue follow-ups, and a quick fix-up commit had to wait for the slower previous build to finish before deploying. Trade-off accepted: a deploy interrupted mid-upload is benign because `peaceiris/actions-gh-pages` re-publishes the whole `publish_dir` atomically per run.

#### `.github/workflows/pr-preview.yml` (rewritten)

```yaml
name: PR Preview

on:
    pull_request:
        types: [opened, synchronize, reopened, closed]

concurrency:
    group: pr-preview-${{ github.ref }}
    cancel-in-progress: true

permissions:
    contents: write
    pull-requests: write

jobs:
    preview:
        runs-on: ubuntu-latest
        env:
            PUBLIC_BASE_PATH: /skyline-scroller/pr-preview/pr-${{ github.event.pull_request.number }}/
        steps:
            - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
            - uses: ./.github/actions/setup
            - name: Run tests
              run: npm test
            - name: Build
              run: npm run build
            - name: Deploy PR Preview
              uses: rossjrw/pr-preview-action@f31d5aa7b364955ea86228b9dcd346dc3f29c408 # v1.4.7
              with:
                  source-dir: ./dist
```

#### SHA pinning

Pinning third-party actions (`peaceiris/actions-gh-pages`, `rossjrw/pr-preview-action`, `actions/setup-node`, `actions/checkout`, `actions/upload-artifact`) to commit SHAs (with the version tag in a comment) is a supply-chain hygiene baseline — a compromised tag can't be silently re-pointed. SHAs above are illustrative; pin to the actual commits from the actions' releases at apply time.

## Acceptance criteria

1. **`vitest run` passes.** `tests/Random.test.ts` must continue to pass unmodified.
2. **`vite build` (no env var) produces a working local artefact** — `npm run preview` opens at `http://localhost:4173/` and renders identically to dev.
3. **`npm run dev` works** — no broken imports, no missing globals, no `__PACKAGE_VERSION__` undefined errors.
4. **CI workflows green** on a no-op PR — `lint`, `test`, `build`, `preview` jobs all pass; deploy on merge-to-main succeeds.
5. **Determinism preserved.** A golden-image / golden-stream test: for a fixed seed (e.g. `"skyline-scroller-DEC-05"`) generate the first 50 000 px of city across all four layers, hash the resulting `(x, type, params)` tuple stream, compare against the pre-DEC-05 hash. **Must match byte-for-byte.** This test belongs in `tests/procgen-determinism.test.ts` and is added as part of this work.
6. **CSS visually identical** except the volume slider now works in Chrome 125+ and Firefox 124+. Manual smoke test: open settings, hover sound button, drag slider, observe game volume changing. The previously dead control becomes interactive.
7. **z-index collisions resolved.** No two interactive surfaces share the same stacking value. Verified by `grep -E '^\s*z-index:' src/style.css` returning only `var(--z-*)` references.
8. **`package.json` version === `VERSION` constant** at runtime. Add a test: `expect(VERSION).toBe('1.1.2')`.
9. **Adding a sixth biome touches exactly 2 files.** Acceptance demo: PR adding `swamp.ts` + 1-line edit to `_index.ts`. No changes to `BiomeSystem.ts`, no changes to `CityGenerator.ts`, no changes to `TreeConfig.ts` (except adding `swamp` to existing `biomes[]` entries where desired). This is a manual smoke check, not a unit test.

## Risks

### R1 — Determinism drift from registry reordering

The biome JSON-ification could subtly reorder RNG draws and produce different worlds for the same seed. The two failure modes:

- **`REGION_IDS` order ≠ legacy `allBiomes` order.** `BiomeSystem.ts:22` declares `['forest', 'desert', 'tundra', 'plains', 'city']`. `Object.keys(REGIONS)` returns insertion order (guaranteed in ES2020+), so the `_index.ts` import + export order is load-bearing. Mitigation: comment in `_index.ts` explicitly states **"DO NOT REORDER — determinism contract with seeds in the wild"**, and acceptance test #5 catches any drift.
- **`CityGenerator.pickX` RNG count change.** The legacy pickers use `r = this.rng.nextFloat()` once per pick and then branch. If the new weighted-uniform implementation calls `nextFloat()` twice (e.g. once for the weight roll, once for a tiebreak), every seed produces a different city from chunk 0 onward. Mitigation: the rewrite is explicit — **one `nextFloat()` per pick**, weighted via cumulative-sum comparison. Acceptance test #5 is the safety net.

### R2 — `__PACKAGE_VERSION__` not defined in test environment

Vitest does not run `vite.config.ts`'s `define` by default. The `version.ts` import will throw `__PACKAGE_VERSION__ is not defined` in unit tests. Mitigation: `vitest.config.ts` (new file, ~10 LOC) extends `vite.config.ts` and re-applies the `define`. Or simpler: `version.ts` reads `typeof __PACKAGE_VERSION__ !== 'undefined' ? __PACKAGE_VERSION__ : '0.0.0-test'`.

### R3 — CSS custom-property repaint cost

`var(--c-*)` resolution is free in modern engines, but changing a `:root` token at runtime triggers a full restyle. We don't do that today; if a future "theme picker" is added, document that token swaps should batch via `document.documentElement.style.setProperty`. Out of scope for DEC-05.

### R4 — Volume-slider rotation breaks keyboard a11y

A rotated horizontal `<input type="range">` still receives left/right arrow keys, but the visual mapping (left = down) confuses screen-reader users. Mitigation: the `@supports (writing-mode: vertical-lr)` branch is preferred when available — modern Firefox and Chromium 125+ support it natively, the rotation is the fallback for older browsers only. Add `aria-orientation="vertical"` to the input.

### R5 — Composite action + workflow_dispatch interaction

A `workflow_dispatch` trigger on `deploy.yml` runs against the default branch's `_setup` action, not the branch being dispatched. This is desired behaviour but worth noting for future readers — if someone forks and renames the action, manual deploys may break until the rename propagates.

### R6 — Pinning churn

SHA-pinned actions mean Dependabot PRs every time an action releases. Mitigation: enable Dependabot grouping for `github-actions` ecosystem (`.github/dependabot.yml`) so all action bumps batch into one weekly PR.

### R7 — `currentTreeConfig` mutability leaks into registry

`TreeConfig.ts:60` exports `let currentTreeConfig` as a mutable global, reset via `resetTreeConfigToDefault`. If the registry's `BiomeDefinition.treeSpecies` is also consulted at chunk time, two sources of truth disagree on "can a pine spawn here?". Decision: **registry wins for biome→species mapping; TreeConfig only controls per-tree `enabled` / `minHeight` / `maxHeight` / `flowerChance` knobs that don't overlap.** `TreeConfig.biomes[]` field is deprecated but kept for one release to avoid breaking the existing UI; a TODO comment notes the cleanup.

## References

- `src/procgen/BiomeSystem.ts:11-17,22-24,38-39,49` — current biome table + RNG draws
- `src/procgen/CityGenerator.ts:196-231` — biome→material/roof/color switches to be replaced
- `src/procgen/TreeConfig.ts:14-57` — existing tree-config registry pattern, the model for the new region registry
- `src/engine/SkySystem.ts:9-25` — 17 sky keyframes to move into `COLORS.sky.keyframes`
- `src/engine/Game.ts:111-114` — inline parallax layer construction
- `src/engine/Building.ts:55-86` — building color literals
- `src/engine/Tree.ts:61-183` — tree color literals
- `src/engine/Ground.ts:26-46` — ground color literals
- `src/style.css:1-14,329-338` — root font/colour block; broken slider declarations
- `src/style.css:76,128,132,161,228,284,310,348,454` — current z-index sites with collisions
- `.github/workflows/ci.yml:48`, `deploy.yml:35`, `pr-preview.yml:35` — three duplicated `--base=` CLI flags to be replaced by `PUBLIC_BASE_PATH` env
- `package.json:4` — version literal `1.0.0-beta` to bump to `1.1.2`
- Related: [[entities/BiomeSystem]], [[entities/TreeConfig]], [[entities/CityGenerator]], [[entities/SkySystem]], [[entities/Building]], [[systems/procgen]], [[systems/sky]], [[systems/css-architecture]], [[operations/build-deploy]], [[concepts/determinism]], [[DEC-02-lifecycle]]
