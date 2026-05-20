/**
 * Custom Generation panel: a side-by-side preview canvas + per-species
 * tree config (enabled, biome list, height min/max, cactus flower%) with
 * Apply (pushes preview's treeConfig into the main game) and a two-click
 * Reset.
 *
 * Owns the previewGame instance and its lifecycle (created on open,
 * disposed on close). Tree-icon drawIcon intervals are tracked and
 * cleared so they don't leak after the panel closes.
 */

import { deepClone } from '../utils/deepClone';
import type { Game } from '../engine/Game';
import { Game as GameCtor } from '../engine/Game';
import { Tree, type TreeType } from '../procgen/entities/Tree';
import type { BiomeType } from '../procgen/BiomeSystem';
import { ALL_BIOMES } from '../regions/_index';
import { DEFAULT_TREE_CONFIG } from '../procgen/TreeConfig';

export interface CustomGenDeps {
    game: Game;
    settingsWindow: HTMLElement;
    customGenWindow: HTMLElement;
    btnCustomGen: HTMLElement;
    btnGenClose: HTMLElement;
    btnGenApply: HTMLElement;
    btnGenReset: HTMLElement;
}

export interface CustomGenHandle {
    open: () => void;
    close: () => void;
    isOpen: () => boolean;
    cancelResetConfirm: () => void;
    /** Called by syncUIFromTerminal so the preview mirrors any treeConfig changes the terminal made to the main game. */
    syncFromGameTreeConfig: () => void;
}

const ICON_REDRAW_MS = 1000;
const RESET_CONFIRM_FADE_MS_OUTER = 3000; // (matches advanced-window pattern; not strictly used here today)
void RESET_CONFIRM_FADE_MS_OUTER;

function getTreeIconScale(type: TreeType): number {
    switch (type) {
        case 'sequoia': return 0.6;
        case 'pine': return 0.8;
        case 'oak': return 0.8;
        case 'bush': return 3.0;
        case 'cactus': return 1.5;
        case 'hedge': return 1.5;
        default: return 0.5;
    }
}

export function initCustomGen(deps: CustomGenDeps): CustomGenHandle {
    const { game, settingsWindow, customGenWindow, btnCustomGen, btnGenClose, btnGenApply, btnGenReset } = deps;

    const previewCanvas = document.getElementById('gen-preview-canvas') as HTMLCanvasElement;
    let previewGame: Game | null = null;
    let isTreeSettingsOpen = false;
    let isResetConfirming = false;
    const iconIntervals: number[] = [];

    // Ensure the dropdown container exists. The HTML template may already
    // ship it; if not, inject before the action buttons row.
    let treeSettingsContainer = document.getElementById('tree-settings-dropdown-container');
    if (!treeSettingsContainer) {
        treeSettingsContainer = document.createElement('div');
        treeSettingsContainer.id = 'tree-settings-dropdown-container';
        treeSettingsContainer.style.marginTop = '20px';
        const buttons = customGenWindow.querySelector('.buttons');
        if (buttons) customGenWindow.insertBefore(treeSettingsContainer, buttons);
        else customGenWindow.appendChild(treeSettingsContainer);
    }

    function isTreeModified(type: TreeType): boolean {
        if (!previewGame || !previewGame.generator) return false;
        const current = previewGame.generator.config[type];
        const def = DEFAULT_TREE_CONFIG[type];
        if (type === 'cactus') {
            if (Math.abs(current.flowerChance - def.flowerChance) > 0.001) return true;
        }
        if (current.enabled !== def.enabled) return true;
        if (JSON.stringify([...current.biomes].sort()) !== JSON.stringify([...def.biomes].sort())) return true;
        if (current.minHeight !== def.minHeight) return true;
        if (current.maxHeight !== def.maxHeight) return true;
        return false;
    }

    function updateTreeResetButton(type: TreeType, btn?: HTMLButtonElement): void {
        if (!btn) {
            const wrapper = document.getElementById(`tree-wrapper-${type}`);
            btn = wrapper?.querySelector(`.btn-smart-reset`) as HTMLButtonElement;
        }
        if (!btn) return;

        const ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btn.innerHTML = ICON_SVG;
        if (isTreeModified(type)) {
            btn.style.background = '#d32f2f';
            btn.style.borderColor = '#b71c1c';
            btn.style.color = 'white';
            btn.title = 'Modified - Click to Reset';
            btn.style.cursor = 'pointer';
        } else {
            btn.style.background = '#FBC02D';
            btn.style.borderColor = '#F9A825';
            btn.style.color = '#333';
            btn.title = 'Default Settings';
            btn.style.cursor = 'default';
        }
    }

    function refreshPreview(): void {
        if (!previewGame || !previewGame.generator) return;
        previewGame.treeConfig = deepClone(previewGame.generator.config);
        const inp = document.getElementById('custom-seed-input') as HTMLInputElement;
        previewGame.setSeed(inp && inp.value ? inp.value : previewGame.getSeed());
        const bSelect = document.getElementById('custom-biome-select') as HTMLSelectElement;
        if (bSelect && bSelect.value !== 'auto') {
            previewGame.generator?.forceBiome(bSelect.value as BiomeType);
        }
    }

    function renderTreeSettings(): void {
        const container = document.getElementById('tree-settings-dropdown-container');
        if (!container || !previewGame || !previewGame.generator) return;

        const updateGlobalResetButton = () => {
            const btn = document.getElementById('tree-settings-reset-all');
            if (!btn || !previewGame || !previewGame.generator) return;

            let isModified = false;
            const config = previewGame.generator.config;
            for (const t of Object.keys(config) as TreeType[]) {
                if (isTreeModified(t)) { isModified = true; break; }
            }

            if (isModified) {
                btn.classList.remove('default');
                btn.classList.add('modified');
                btn.title = 'Reset All to Default';
            } else {
                btn.classList.add('default');
                btn.classList.remove('modified');
                btn.title = 'All Default';
            }
        };

        let headerRow = document.getElementById('tree-settings-header');
        if (!headerRow) {
            headerRow = document.createElement('div');
            headerRow.id = 'tree-settings-header';
            headerRow.style.alignItems = 'center';
            headerRow.style.marginBottom = '5px';
            container.appendChild(headerRow);

            const btnToggle = document.createElement('button');
            btnToggle.id = 'tree-settings-toggle';
            btnToggle.className = 'btn-small';
            btnToggle.style.flex = '1';
            btnToggle.style.textAlign = 'left';
            btnToggle.style.marginRight = '5px';
            btnToggle.onclick = () => {
                isTreeSettingsOpen = !isTreeSettingsOpen;
                renderTreeSettings();
                setTimeout(updateGlobalResetButton, 0);
            };
            headerRow.appendChild(btnToggle);

            const btnResetAll = document.createElement('button');
            btnResetAll.id = 'tree-settings-reset-all';
            btnResetAll.className = 'btn-smart-reset default';
            btnResetAll.style.width = '24px';
            btnResetAll.style.height = '24px';
            btnResetAll.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            btnResetAll.onclick = (e) => {
                e.stopPropagation();
                if (previewGame && previewGame.generator) {
                    previewGame.generator.config = deepClone(DEFAULT_TREE_CONFIG);
                    refreshPreview();
                    renderTreeSettings();
                }
            };
            headerRow.appendChild(btnResetAll);
        }

        const btnToggle = document.getElementById('tree-settings-toggle');
        if (btnToggle) {
            const arrow = isTreeSettingsOpen ? '▼' : '▶';
            btnToggle.innerHTML = `<span>Tree Settings</span> <span>${arrow}</span>`;
        }

        let list = document.getElementById('tree-settings-list');
        if (!isTreeSettingsOpen) {
            if (list) list.style.display = 'none';
            return;
        }

        if (!list) {
            list = document.createElement('div');
            list.id = 'tree-settings-list';
            list.style.marginTop = '5px';
            list.style.maxHeight = '500px';
            list.style.overflowY = 'auto';
            list.style.borderLeft = '2px solid #555';
            list.style.paddingLeft = '5px';
            container.appendChild(list);
        }
        list.style.display = 'block';

        const config = previewGame.generator.config;
        (Object.keys(config) as TreeType[]).forEach(type => {
            const getFreshItem = () => previewGame!.generator!.config[type];
            const item = getFreshItem();

            let wrapper = document.getElementById(`tree-wrapper-${type}`);
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.id = `tree-wrapper-${type}`;
                wrapper.className = 'tree-setting-wrapper';
                wrapper.style.marginBottom = '12px';
                wrapper.style.background = 'rgba(0,0,0,0.3)';
                wrapper.style.padding = '8px';
                wrapper.style.display = 'flex';
                wrapper.style.flexDirection = 'column';
                list!.appendChild(wrapper);

                wrapper.innerHTML = `
                    <div class="tree-header" style="display:flex; align-items:center; gap:10px; margin-bottom: 5px;">
                        <div class="icon-container" style="width:100px; height:100px; background:rgba(255,255,255,0.05); border-radius:4px; flex: 0 0 100px; display:flex; justify-content:center; align-items:center; overflow:hidden;">
                            <canvas id="icon-${type}" width="100" height="100"></canvas>
                        </div>
                        <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <label style="display:flex; align-items:center; gap:8px; font-weight:bold; font-size:1.1em; cursor:pointer;">
                                    <input type="checkbox" id="cb-${type}" style="width:18px; height:18px;">
                                    ${type.charAt(0).toUpperCase() + type.slice(1)}
                                </label>
                                <button class="btn-smart-reset" id="reset-${type}" title="Reset"></button>
                            </div>
                            <div id="biomes-${type}" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
                        </div>
                    </div>
                    <div class="tree-details" style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
                         <div style="display:flex; align-items:center; gap:5px;">
                            <span style="font-size:0.9em; width:50px;">Height:</span>
                            <input type="number" id="h-min-${type}" style="width:50px; padding:4px; background:rgba(0,0,0,0.5); border:1px solid #555; color:white;">
                            <div class="dual-slider-container">
                                 <div class="dual-slider-track-bg"></div>
                                 <div class="dual-slider-track-fill" id="track-${type}"></div>
                                 <input type="range" id="slider-min-${type}" min="0" max="400" step="1" class="dual-slider-input">
                                 <input type="range" id="slider-max-${type}" min="0" max="400" step="1" class="dual-slider-input">
                            </div>
                            <input type="number" id="h-max-${type}" style="width:50px; padding:4px; background:rgba(0,0,0,0.5); border:1px solid #555; color:white;">
                         </div>
                         <div id="extra-${type}"></div>
                    </div>
                `;

                const ctx = (wrapper.querySelector(`#icon-${type}`) as HTMLCanvasElement).getContext('2d');
                if (ctx) {
                    const drawIcon = () => {
                        if (!previewGame || !previewGame.generator) return;
                        ctx.clearRect(0, 0, 100, 100);
                        const cfg = previewGame!.generator.config[type];
                        const h = Math.floor((cfg.minHeight + cfg.maxHeight) / 2);
                        const flowerChance = cfg.flowerChance;
                        const scale = getTreeIconScale(type);
                        const t = new Tree(0, type, h, flowerChance);
                        const scaledW = t.width * scale;
                        const scaledH = t.height * scale;
                        const tx = 50 - scaledW / 2;
                        const ty = 50 + scaledH / 2;
                        ctx.save();
                        ctx.translate(tx, ty);
                        ctx.scale(scale, scale);
                        t.x = 0;
                        t.draw(ctx, 0);
                        ctx.restore();
                    };
                    drawIcon();
                    iconIntervals.push(window.setInterval(drawIcon, ICON_REDRAW_MS));
                }

                const resetBtn = wrapper.querySelector(`#reset-${type}`) as HTMLButtonElement;
                resetBtn.onclick = () => {
                    if (!isTreeModified(type)) return;
                    if (previewGame && previewGame.generator) {
                        previewGame.generator.config[type] = deepClone(DEFAULT_TREE_CONFIG[type]);
                        refreshPreview();
                        renderTreeSettings();
                    }
                };
            }

            const cb = wrapper!.querySelector(`#cb-${type}`) as HTMLInputElement;
            if (cb.checked !== item.enabled) cb.checked = item.enabled;
            cb.onchange = (e) => {
                getFreshItem().enabled = (e.target as HTMLInputElement).checked;
                updateTreeResetButton(type);
                refreshPreview();
            };

            updateTreeResetButton(type);

            const biomesContainer = wrapper!.querySelector(`#biomes-${type}`) as HTMLElement;
            if (biomesContainer.children.length === 0) {
                ALL_BIOMES.forEach(biome => {
                    const bBtn = document.createElement('button');
                    bBtn.innerText = biome.charAt(0).toUpperCase() + biome.slice(1);
                    bBtn.style.fontSize = '11px';
                    bBtn.style.padding = '3px 8px';
                    bBtn.style.border = '1px solid #444';
                    bBtn.style.borderRadius = '3px';
                    bBtn.style.cursor = 'pointer';
                    bBtn.dataset.biome = biome;
                    bBtn.onclick = () => {
                        const fresh = getFreshItem();
                        const idx = fresh.biomes.indexOf(biome);
                        if (idx === -1) fresh.biomes.push(biome);
                        else fresh.biomes.splice(idx, 1);
                        updateTreeResetButton(type);
                        refreshPreview();
                        renderTreeSettings();
                    };
                    biomesContainer.appendChild(bBtn);
                });
            }
            Array.from(biomesContainer.children).forEach(child => {
                const btn = child as HTMLButtonElement;
                const biome = btn.dataset.biome as BiomeType;
                if (item.biomes.includes(biome)) {
                    btn.style.background = '#2E7D32';
                    btn.style.color = 'white';
                    btn.style.borderColor = '#4CAF50';
                } else {
                    btn.style.background = '#333';
                    btn.style.color = '#aaa';
                    btn.style.borderColor = '#444';
                }
            });

            const minInp = wrapper!.querySelector(`#h-min-${type}`) as HTMLInputElement;
            const maxInp = wrapper!.querySelector(`#h-max-${type}`) as HTMLInputElement;
            const sliderMinEl = wrapper!.querySelector(`#slider-min-${type}`) as HTMLInputElement;
            const sliderMaxEl = wrapper!.querySelector(`#slider-max-${type}`) as HTMLInputElement;
            const track = wrapper!.querySelector(`#track-${type}`) as HTMLElement;

            const def = DEFAULT_TREE_CONFIG[type];
            const rangeMin = Math.floor(def.minHeight * 0.8);
            const rangeMax = Math.ceil(def.maxHeight * 1.2);
            const rangeSpan = rangeMax - rangeMin;

            sliderMinEl.min = rangeMin.toString();
            sliderMinEl.max = rangeMax.toString();
            sliderMaxEl.min = rangeMin.toString();
            sliderMaxEl.max = rangeMax.toString();

            const updateVisuals = () => {
                const fresh = getFreshItem();
                const v1 = fresh.minHeight;
                const v2 = fresh.maxHeight;
                if (document.activeElement !== minInp) minInp.value = v1.toString();
                if (document.activeElement !== maxInp) maxInp.value = v2.toString();
                if (document.activeElement !== sliderMinEl) sliderMinEl.value = Math.max(rangeMin, Math.min(rangeMax, v1)).toString();
                if (document.activeElement !== sliderMaxEl) sliderMaxEl.value = Math.max(rangeMin, Math.min(rangeMax, v2)).toString();
                const p1Val = Math.max(0, Math.min(100, ((v1 - rangeMin) / rangeSpan) * 100));
                const p2Val = Math.max(0, Math.min(100, ((v2 - rangeMin) / rangeSpan) * 100));
                track.style.left = `calc(${p1Val}% + 8px - ${p1Val * 0.16}px)`;
                track.style.width = `calc(${p2Val - p1Val}% - ${(p2Val - p1Val) * 0.16}px)`;
            };
            updateVisuals();

            const updateFromMinSlider = () => {
                let v1 = parseInt(sliderMinEl.value);
                const fresh = getFreshItem();
                if (v1 > fresh.maxHeight) v1 = fresh.maxHeight;
                fresh.minHeight = v1;
                updateTreeResetButton(type);
                updateGlobalResetButton();
                refreshPreview();
                updateVisuals();
            };
            const updateFromMaxSlider = () => {
                let v2 = parseInt(sliderMaxEl.value);
                const fresh = getFreshItem();
                if (v2 < fresh.minHeight) v2 = fresh.minHeight;
                fresh.maxHeight = v2;
                updateTreeResetButton(type);
                updateGlobalResetButton();
                refreshPreview();
                updateVisuals();
            };

            sliderMinEl.oninput = updateFromMinSlider;
            sliderMaxEl.oninput = updateFromMaxSlider;

            minInp.onchange = (e) => {
                let val = parseInt((e.target as HTMLInputElement).value);
                const fresh = getFreshItem();
                if (val > fresh.maxHeight) val = fresh.maxHeight;
                fresh.minHeight = val;
                updateTreeResetButton(type);
                updateGlobalResetButton();
                refreshPreview();
                updateVisuals();
            };
            maxInp.onchange = (e) => {
                let val = parseInt((e.target as HTMLInputElement).value);
                const fresh = getFreshItem();
                if (val < fresh.minHeight) val = fresh.minHeight;
                fresh.maxHeight = val;
                updateTreeResetButton(type);
                updateGlobalResetButton();
                refreshPreview();
                updateVisuals();
            };

            const extraContainer = wrapper!.querySelector(`#extra-${type}`) as HTMLElement;
            if (type === 'cactus') {
                if (!extraContainer.innerHTML) {
                    extraContainer.innerHTML = `
                        <div style="display:flex; align-items:center; gap:5px; margin-top:5px;">
                            <span style="font-size:0.9em;">Flower %:</span>
                            <input type="range" id="flower-${type}" min="0" max="100" step="0.1" style="flex:1;">
                            <span id="flower-val-${type}" style="width:40px; text-align:right; font-size:0.9em;"></span>
                        </div>
                     `;
                }
                const fInp = extraContainer.querySelector(`#flower-${type}`) as HTMLInputElement;
                const fVal = extraContainer.querySelector(`#flower-val-${type}`) as HTMLElement;
                const currentPct = (item.flowerChance * 100).toFixed(1);
                if (document.activeElement !== fInp) fInp.value = currentPct;
                fVal.innerText = currentPct + '%';
                fInp.oninput = (e) => {
                    const val = parseFloat((e.target as HTMLInputElement).value);
                    getFreshItem().flowerChance = val / 100;
                    fVal.innerText = val.toFixed(1) + '%';
                    updateTreeResetButton(type);
                    updateGlobalResetButton();
                    refreshPreview();
                };
            } else {
                extraContainer.innerHTML = '';
            }
        });

        updateGlobalResetButton();
    }

    function open(): void {
        const seedInp = document.getElementById('custom-seed-input') as HTMLInputElement;
        if (seedInp) seedInp.value = game.getSeed();

        if (customGenWindow.classList.contains('visible')) {
            customGenWindow.classList.remove('visible');
            return;
        }
        settingsWindow.classList.remove('visible');
        customGenWindow.classList.add('visible');

        if (!previewGame) {
            previewGame = new GameCtor(previewCanvas, true);
            previewGame.resize();
        }
        previewGame.start();
        renderTreeSettings();
    }

    function close(): void {
        customGenWindow.classList.remove('visible');
        iconIntervals.forEach(i => clearInterval(i));
        iconIntervals.length = 0;
        if (previewGame) {
            previewGame.dispose();
            previewGame = null;
        }
        cancelResetConfirm();
    }

    function isOpen(): boolean {
        return customGenWindow.classList.contains('visible');
    }

    function cancelResetConfirm(): void {
        if (!isResetConfirming) return;
        isResetConfirming = false;
        btnGenReset.innerText = 'Reset Default';
        btnGenReset.style.background = '#c62828';
    }

    function syncFromGameTreeConfig(): void {
        if (previewGame && previewGame.generator) {
            previewGame.generator.config = deepClone(game.treeConfig);
            previewGame.treeConfig = deepClone(game.treeConfig);
        }
        if (customGenWindow.classList.contains('visible')) {
            renderTreeSettings();
            refreshPreview();
        }
    }

    // ----- Wiring -----

    btnCustomGen.addEventListener('click', open);
    btnGenClose.addEventListener('click', close);

    btnGenApply.addEventListener('click', () => {
        cancelResetConfirm();
        const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;
        if (previewGame && previewGame.generator) {
            game.treeConfig = deepClone(previewGame.generator.config);
        }
        game.setSeed(seed || game.getSeed());
    });

    btnGenReset.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isResetConfirming) {
            const randomSeed = Math.floor(Math.random() * 100000).toString();
            const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
            if (customSeedInput) customSeedInput.value = randomSeed;
            if (previewGame) {
                previewGame.setSeed(randomSeed);
                if (previewGame.generator) {
                    const def = deepClone(DEFAULT_TREE_CONFIG);
                    previewGame.generator.config = def;
                    previewGame.treeConfig = deepClone(def);
                }
            }
            renderTreeSettings();
            cancelResetConfirm();
        } else {
            isResetConfirming = true;
            btnGenReset.innerText = 'Confirm Reset?';
            btnGenReset.style.background = '#8b0000';
        }
    });

    customGenWindow.addEventListener('click', (e) => {
        if (e.target !== btnGenReset) cancelResetConfirm();
    });

    // Preview-side controls (refresh, pause, speed, biome filter, random preview seed).
    const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
    customSeedInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') refreshPreview();
    });

    const btnGenRefresh = document.getElementById('btn-gen-refresh');
    const btnGenPause = document.getElementById('btn-gen-pause');
    const genSpeedSlider = document.getElementById('gen-speed-slider') as HTMLInputElement | null;
    const iconGenPause = document.getElementById('icon-gen-pause');
    const btnRandomPreviewSeed = document.getElementById('btn-random-preview-seed');
    const customBiomeSelect = document.getElementById('custom-biome-select') as HTMLSelectElement | null;

    if (btnRandomPreviewSeed) {
        btnRandomPreviewSeed.onclick = () => {
            const newSeed = Math.floor(Math.random() * 100000).toString();
            const inp = document.getElementById('custom-seed-input') as HTMLInputElement;
            if (inp) inp.value = newSeed;
            const savedX = previewGame ? previewGame.getCameraX() : 0;
            refreshPreview();
            if (previewGame) previewGame.setCameraX(savedX);
        };
    }
    if (customBiomeSelect) customBiomeSelect.addEventListener('change', () => refreshPreview());
    if (btnGenRefresh) btnGenRefresh.onclick = () => refreshPreview();
    if (btnGenPause) {
        btnGenPause.onclick = () => {
            if (!previewGame) return;
            if (previewGame.timeScale === 0) {
                previewGame.timeScale = parseFloat(genSpeedSlider?.value ?? '1') || 1.0;
                if (iconGenPause) iconGenPause.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
            } else {
                previewGame.timeScale = 0;
                if (iconGenPause) iconGenPause.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
            }
        };
    }
    if (genSpeedSlider) {
        genSpeedSlider.oninput = () => {
            if (!previewGame) return;
            const val = parseFloat(genSpeedSlider.value);
            previewGame.timeScale = val;
            if (val > 0 && previewGame.timeScale > 0 && iconGenPause) {
                iconGenPause.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
            }
        };
    }

    return { open, close, isOpen, cancelResetConfirm, syncFromGameTreeConfig };
}
