import './style.css'

window.addEventListener('error', (event) => {
    alert(`Runtime Error: ${event.message} at ${event.filename}:${event.lineno}`);
});

import { Game } from './engine/Game'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="ui-layer">
    <div id="seed-display" style="pointer-events: auto;">
      <span id="ui-seed-label">Seed: </span>
      <span id="ui-seed-val" title="Click to Copy Seed" style="cursor: pointer;">Loading...</span>
      <span id="ui-divider"> | </span>
      <span id="ui-time-label">T: </span>
      <span id="ui-time-val" title="Click to Copy Time" style="cursor: pointer;">0</span>
    </div>
    <!-- Legacy Controls (Can keep as is) -->
    <div id="controls" style="margin-top: 10px; pointer-events: auto;">
      <input type="text" id="seed-input" placeholder="Enter seed..." style="padding: 5px; border-radius: 4px; border: none;">
      <button id="set-seed-btn" style="padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; background: #eee; color: #333;">Set Seed</button>
      <button id="random-seed-btn" style="padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; background: #eee; color: #333;">Randomize</button>
    </div>
  </div>

  <!-- Advanced Control Panel -->
  <div id="bottom-right-controls">
    <!-- Terminal Button -->
    <button id="btn-terminal" class="control-btn" title="Terminal (t)">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 17l6-6-6-6M12 19h8" />
      </svg>
    </button>
    
    <!-- Sound Button -->
    <div id="sound-container" style="position: relative;">
      <div id="volume-popup">
        <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1" orient="vertical">
      </div>
      <button id="btn-sound" class="control-btn" title="Mute (m)">
        <svg id="icon-sound" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
      </button>
    </div>

    <!-- Settings Button -->
    <div style="position: relative;">
      <div id="settings-window" class="ui-window">
        <!-- Top Row controls -->
        <div class="row" style="justify-content: center;">
          <!-- Fullscreen -->
          <button id="btn-fullscreen" class="btn-small" title="Fullscreen">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <!-- Corners -->
               <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>
             </svg>
          </button>
          <!-- Custom Gen -->
          <button id="btn-custom-gen" class="btn-small" title="Generate">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <!-- Plus Box -->
                <rect x="3" y="3" width="18" height="18" rx="4"/>
                <path d="M12 8v8M8 12h8"/>
             </svg>
          </button>
          <!-- Advanced -->
          <button id="btn-advanced" class="btn-small" title="Advanced">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <!-- Simple Toggles -->
                <path d="M4 12h16M4 6h16M4 18h16"/>
                <circle cx="8" cy="6" r="2" fill="currentColor"/>
                <circle cx="16" cy="12" r="2" fill="currentColor"/>
                <circle cx="8" cy="18" r="2" fill="currentColor"/>
             </svg>
          </button>
        </div>
        
        <!-- Speed Slider -->
        <div style="margin-top: 10px;">
          <label style="font-size: 12px; display:block; margin-bottom: 5px; color:#aaa;">Simulation Speed</label>
          <!-- Logarithmic scale: -1 to 1. 0 is 1x. -->
          <input type="range" id="speed-slider" min="-1" max="1" step="0.01" value="0">
        </div>
      </div>

      <!-- Advanced Options Window -->
      <div id="advanced-window" class="ui-window">
        <h3>Advanced Options</h3>
        
        <div class="setting-group" style="margin-top:20px;">
          <div class="row" style="align-items: center; justify-content: space-between;">
             <label style="margin-right: 10px;">Time Format</label>
             <div id="time-fmt-selector" style="display: flex; gap: 5px; flex: 1;">
                 <button class="btn-small" data-val="24h">HH:MM</button>
                 <button class="btn-small" data-val="12h">AM/PM</button>
                 <button class="btn-small" data-val="score">Ingame Time</button>
             </div>
             <button id="btn-reset-time-fmt" class="btn-smart-reset default" title="Reset to Default" style="margin-left: 10px;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="18" y1="6" x2="6" y2="18"></line>
                 <line x1="6" y1="6" x2="18" y2="18"></line>
               </svg>
             </button>
          </div>
        </div>

        <div class="row" style="margin-top:auto; justify-content: flex-end; gap: 10px;">
           <button id="btn-adv-reset" class="btn-small" style="flex:0 0 120px; background: #c62828;">Reset Default</button>
           <button id="btn-adv-close" class="control-btn" style="flex:0 0 80px; font-size:14px; background:#444;">Close</button>
        </div>
      </div>

      <button id="btn-settings" class="control-btn" title="Settings">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
           <!-- Hexagon Nut -->
           <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
           <circle cx="12" cy="12" r="4" />
        </svg>
      </button>
    </div>
  </div>


  <!-- Custom Generation Window -->
  <div id="custom-gen-window" class="ui-window">
    <h3 style="margin-top: 0; text-align: center;">Custom World Generation</h3>
    
    <div id="custom-gen-content">
      <div id="gen-controls">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 5px;">
             <div style="flex: 1; display: flex; align-items: center; margin-right: 5px;">
                <span style="margin-right: 5px; font-size: 0.9em; font-weight: bold; color: #ccc;">Seed:</span>
                <input type="text" id="custom-seed-input" placeholder="Seed" style="flex: 1; padding: 4px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: white;">
             </div>
             <button id="btn-random-preview-seed" title="Randomize Seed" style="width: 24px; height: 24px; border-radius: 4px; border: none; background: #1565C0; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.3"/>
                </svg>
             </button>
        </div>
        
        <!-- Tree Settings Dropdown -->
        <div id="tree-settings-dropdown-container" style="margin-bottom: 5px;"></div>
        
        <button class="btn-small" style="background:#446; text-align:center;">Density: Medium</button>
        <button class="btn-small" style="background:#446; text-align:center;">Terrain: Hilly</button>
        <button class="btn-small" style="background:#446; text-align:center;">Weather: Clear</button>
      </div>

      <div id="gen-preview-container">
         <canvas id="gen-preview-canvas"></canvas>
         
         <!-- Control Bar Overlay (Bottom Right) -->
         <div id="preview-control-bar" style="position: absolute; bottom: 10px; right: 10px; display: flex; gap: 8px; background: rgba(0,0,0,0.6); padding: 5px; border-radius: 8px; align-items: center;">
            
            <!-- Speed -->
            <div style="display: flex; align-items: center; gap: 5px; padding-right: 5px; border-right: 1px solid #555;">
                <span style="font-size: 10px; color: #ccc;">Speed</span>
                <input type="range" id="gen-speed-slider" min="0.1" max="3" step="0.1" value="1" style="width: 60px;">
            </div>

            <!-- Play/Pause -->
            <button id="btn-gen-pause" class="btn-small" style="width: 32px; height: 32px; padding: 0;" title="Pause/Play">
                 <svg id="icon-gen-pause" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            </button>

            <!-- Refresh -->
            <button id="btn-gen-refresh" class="btn-small" style="width: 32px; height: 32px; padding: 0;" title="Refresh">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            </button>

         </div>
      </div>
    </div>
    
    <div class="row" style="justify-content: flex-end; gap: 10px;">
      <button id="btn-gen-reset" class="btn-small" style="flex:0 0 120px; background: #c62828;">Reset Default</button>
      <button id="btn-gen-apply" class="btn-small" style="flex:0 0 120px; background: #2E7D32;">Apply</button>
      <button id="btn-gen-close" class="btn-small" style="flex:0 0 80px;">Close</button>
    </div>
  </div>

  <!-- Terminal Bar -->
  <div id="terminal-bar">
    <span style="font-weight: bold; margin-right: 10px; color:#0f0;">&gt;_</span>
    <input type="text" id="terminal-input" autocomplete="off" spellcheck="false">
  </div>

  <!-- Gesture Slider (Hidden) -->
  <div id="gesture-slider-container">
    Speed: <span id="gesture-speed-val">1.0x</span>
    <div style="width: 200px; height: 10px; background: #222; margin-top: 5px; border: 1px solid #555;">
      <div id="gesture-slider-bar" style="width: 50%; height: 100%; background: #fff;"></div>
    </div>
  </div>


  <canvas id="game-canvas"></canvas>
`

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const game = new Game(canvas);

// Random start
const initialSeed = Math.floor(Math.random() * 100000).toString();
game.setSeed(initialSeed);
game.start();

// UI Logic
const seedInput = document.getElementById('seed-input') as HTMLInputElement;
const setSeedBtn = document.getElementById('set-seed-btn') as HTMLButtonElement;
const randomSeedBtn = document.getElementById('random-seed-btn') as HTMLButtonElement;

// New UI Elements
const uiSeedVal = document.getElementById('ui-seed-val');
const uiTimeVal = document.getElementById('ui-time-val');

function copyToClipboard(element: HTMLElement | null, textFn: () => string) {
    if (!element) return;
    element.addEventListener('click', () => {
        const text = textFn();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            // Use class-based feedback or forcing style and clearing it
            // To avoid race conditions, we just force green then clear inline style
            element.style.color = "#4CAF50"; // Green
            setTimeout(() => {
                // Revert to CSS default by clearing inline style
                element.style.color = "";
            }, 500);
        });
    });
}

copyToClipboard(uiSeedVal, () => uiSeedVal?.innerText || "");
copyToClipboard(uiTimeVal, () => uiTimeVal?.innerText || "");

const applySeed = () => {
    if (seedInput.value) {
        game.setSeed(seedInput.value);
        setSeedBtn.blur();
        seedInput.blur();
    }
};

setSeedBtn.addEventListener('click', applySeed);

seedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        applySeed();
    }
});

randomSeedBtn.addEventListener('click', () => {
    const newSeed = Math.floor(Math.random() * 100000).toString();
    game.setSeed(newSeed);
    randomSeedBtn.blur();
});

// --- Advanced Control Panel Logic ---

// Elements
const btnTerminal = document.getElementById('btn-terminal')!;
const btnSound = document.getElementById('btn-sound')!;
const soundContainer = document.getElementById('sound-container')!;
const volumePopup = document.getElementById('volume-popup')!;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

const btnSettings = document.getElementById('btn-settings')!;
const settingsWindow = document.getElementById('settings-window')!;
const btnAdvanced = document.getElementById('btn-advanced')!;
const advancedWindow = document.getElementById('advanced-window')!;
const btnAdvClose = document.getElementById('btn-adv-close')!;
// Global reset restored
const btnAdvReset = document.getElementById('btn-adv-reset')!;

const btnResetTimeFmt = document.getElementById('btn-reset-time-fmt')!;
const timeFmtSelector = document.getElementById('time-fmt-selector')!;
const timeFmtButtons = timeFmtSelector.querySelectorAll('button');

const updateResetButton = (btn: HTMLElement, isDefault: boolean) => {
    if (isDefault) {
        btn.classList.add('default');
        btn.classList.remove('modified');
        btn.title = "Default";
    } else {
        btn.classList.add('modified');
        btn.classList.remove('default');
        btn.title = "Reset to Default";
    }
};

const updateTimeFormatUI = () => {
    const current = game.timeFormat || '24h';
    timeFmtButtons.forEach(btn => {
        if (btn.dataset.val === current) {
            btn.classList.add('btn-selected');
        } else {
            btn.classList.remove('btn-selected');
        }
    });

    // Update Reset Button State
    const isDefault = current === '24h';
    updateResetButton(btnResetTimeFmt, isDefault);
}

// Init UI State immediately
updateTimeFormatUI();


// Advanced Options Logic
btnAdvanced.addEventListener('click', () => {
    // Close settings, open Advanced
    settingsWindow.classList.remove('visible');
    const isVis = advancedWindow.classList.contains('visible');

    if (isVis) {
        advancedWindow.classList.remove('visible');
    } else {
        // Sync state immediately on open
        updateTimeFormatUI();
        advancedWindow.classList.add('visible');

        // Reset global confirm state
        cancelAdvResetConfirm();
    }
});

timeFmtButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val as '24h' | '12h' | 'score';
        game.timeFormat = val; // Immediate effect
        updateTimeFormatUI();
    });
});

btnResetTimeFmt.addEventListener('click', () => {
    // Only act if modified (red)
    if (btnResetTimeFmt.classList.contains('modified')) {
        game.timeFormat = '24h'; // Default
        updateTimeFormatUI();
    }
});

// Global Reset Logic
let isAdvResetConfirming = false;
const cancelAdvResetConfirm = () => {
    if (isAdvResetConfirming) {
        isAdvResetConfirming = false;
        btnAdvReset.innerText = "Reset Default";
        btnAdvReset.style.background = "#c62828";
    }
}

btnAdvReset.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isAdvResetConfirming) {
        // Confirmed
        // Reset ALL settings here
        game.timeFormat = '24h';
        updateTimeFormatUI();

        cancelAdvResetConfirm();
    } else {
        isAdvResetConfirming = true;
        btnAdvReset.innerText = "Confirm Reset?";
        btnAdvReset.style.background = "#8b0000";
    }
});

// Click elsewhere cancels confirm
advancedWindow.addEventListener('click', (e) => {
    if (e.target !== btnAdvReset) cancelAdvResetConfirm();
});

btnAdvClose.addEventListener('click', () => {
    cancelAdvResetConfirm();
    advancedWindow.classList.remove('visible');
});
const btnFullscreen = document.getElementById('btn-fullscreen')!;
const btnCustomGen = document.getElementById('btn-custom-gen')!;
// btnAdvanced already declared above
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

const customGenWindow = document.getElementById('custom-gen-window')!;
const btnGenClose = document.getElementById('btn-gen-close')!;
const btnGenApply = document.getElementById('btn-gen-apply')!;
// btnGenPreview removed
const btnGenReset = document.getElementById('btn-gen-reset')!;

const terminalBar = document.getElementById('terminal-bar')!;
const terminalInput = document.getElementById('terminal-input') as HTMLInputElement;

const gestureContainer = document.getElementById('gesture-slider-container')!;
const gestureSpeedVal = document.getElementById('gesture-speed-val')!;
const gestureBar = document.getElementById('gesture-slider-bar')!;

// functionality wrappers
const toggleWindow = (el: HTMLElement) => {
    const isVisible = el.classList.contains('visible');
    if (isVisible) el.classList.remove('visible');
    else el.classList.add('visible');
    return !isVisible;
};

// 1. Settings Window (Logic moved to Advanced/Settings block above)
// Removed old alert listener

btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWindow(settingsWindow);
});

// Close settings when clicking outside
window.addEventListener('click', (e) => {
    if (settingsWindow.classList.contains('visible')) {
        if (!settingsWindow.contains(e.target as Node) && !btnSettings.contains(e.target as Node)) {
            settingsWindow.classList.remove('visible');
        }
    }
});

// 1a. Fullscreen
const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
};
btnFullscreen.addEventListener('click', toggleFullscreen);

// 1b. Custom Gen & Preview
let previewGame: Game | null = null;
const previewCanvas = document.getElementById('gen-preview-canvas') as HTMLCanvasElement;

const openCustomGen = () => {

    // Default Seed: Current Game Seed
    const seedInp = document.getElementById('custom-seed-input') as HTMLInputElement;
    if (seedInp) {
        seedInp.value = game.getSeed();
    }
    // Check if open, if so close
    if (customGenWindow.classList.contains('visible')) {
        customGenWindow.classList.remove('visible');
        return;
    }

    settingsWindow.classList.remove('visible');
    customGenWindow.classList.add('visible');

    // Init preview game if needed
    if (!previewGame) {
        // Init with stored config if available, otherwise it picks up default from Game logic? 
        // No, Game(isPreview=true) creates default. We need to overwrite it.
        previewGame = new Game(previewCanvas, true);
        previewGame.resize();
    }

    previewGame.start();
    renderTreeSettings(); // Call render when opening
};
btnCustomGen.addEventListener('click', openCustomGen);
btnGenClose.addEventListener('click', () => {
    customGenWindow.classList.remove('visible');
    // Clear intervals when closing to save perf
    iconIntervals.forEach(i => clearInterval(i));
});

// ... (HTML injection code skipped) ...

// ... (renderTreeSettings code skipped) ...

// Apply Logic
btnGenApply.addEventListener('click', () => {
    cancelResetConfirm();
    const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;

    // 1. Save Config
    if (previewGame && previewGame.generator) {
        game.treeConfig = JSON.parse(JSON.stringify(previewGame.generator.config));
    }

    // 2. Set seed & Reset Game (which uses new treeConfig)
    if (seed) game.setSeed(seed);
    else game.setSeed(game.getSeed()); // Just reload if no new seed, to apply config
});

import { DEFAULT_TREE_CONFIG } from './procgen/TreeConfig';
import type { TreeType } from './engine/Tree';
import type { BiomeType } from './procgen/BiomeSystem';

const treeSettingsContainer = document.getElementById('tree-settings-dropdown-container');

// Inject Tree Settings Container if missing
if (!treeSettingsContainer && customGenWindow) {
    const container = document.createElement('div');
    container.id = 'tree-settings-dropdown-container';
    container.style.marginTop = '20px';
    // Insert before buttons
    const buttons = customGenWindow.querySelector('.buttons');
    if (buttons) customGenWindow.insertBefore(container, buttons);
    else customGenWindow.appendChild(container);
}

// Tree Config Logic
// We manipulate previewGame.generator.config directly.
// On Open: Sync UI with previewGame config (which starts as default).

let isTreeSettingsOpen = false;

import { Tree } from './engine/Tree'; // Ensure Tree is imported

// Track intervals to clear them on re-render
const iconIntervals: number[] = [];

// --- Generator V3 Logic ---

// Helper to Refresh Preview Instantly
// Helper to Refresh Preview Instantly
const refreshPreview = () => {
    if (previewGame && previewGame.generator) {
        // SYNC: Ensure the Game's config matches the Generator's current (modified) config
        previewGame.treeConfig = JSON.parse(JSON.stringify(previewGame.generator.config));

        // Read Seed from Input
        const inp = document.getElementById('custom-seed-input') as HTMLInputElement;
        if (inp && inp.value) {
            previewGame.setSeed(inp.value);
        } else {
            // Fallback to current if empty
            previewGame.setSeed(previewGame.getSeed());
        }
    }
};

// --- Bind Global Preview Controls (Once) ---
// We bind these immediately. Since they are injected statically in the main HTML string,
// they should exist by the time this script runs (deferred).
const btnGenRefresh = document.getElementById('btn-gen-refresh');
const btnGenPause = document.getElementById('btn-gen-pause');
const genSpeedSlider = document.getElementById('gen-speed-slider') as HTMLInputElement;
const iconGenPause = document.getElementById('icon-gen-pause');
const btnRandomPreviewSeed = document.getElementById('btn-random-preview-seed');

if (btnRandomPreviewSeed) {
    btnRandomPreviewSeed.onclick = () => {
        const newSeed = Math.floor(Math.random() * 100000).toString();
        const inp = document.getElementById('custom-seed-input') as HTMLInputElement;
        if (inp) inp.value = newSeed;

        // Preserve Camera Position (Simulation Time)
        let savedX = 0;
        if (previewGame) savedX = previewGame.getCameraX();

        refreshPreview();

        if (previewGame) previewGame.setCameraX(savedX);
    };
}


if (btnGenRefresh) {
    btnGenRefresh.onclick = () => refreshPreview();
}

if (btnGenPause) {
    btnGenPause.onclick = () => {
        if (!previewGame) return;
        if (previewGame.timeScale === 0) {
            // Resume
            previewGame.timeScale = parseFloat(genSpeedSlider.value) || 1.0;
            if (iconGenPause) iconGenPause.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
        } else {
            // Pause
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
        // If not paused, this updates speed. If paused, it updates 'resume' speed but stays paused visually?
        // User behavior: dragging slider usually expects feedback.
        if (val > 0 && previewGame.timeScale > 0 && iconGenPause) {
            iconGenPause.innerHTML = `<rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect>`;
        }
    };
}



// Helper for Icon Scales (Zoom per type)
// Helper for Icon Scales (Zoom per type)
const getTreeIconScale = (type: TreeType) => {
    // Target height: Fill most of the 100px box (e.g., 80-90px)
    switch (type) {
        case 'sequoia': return 0.6;
        case 'pine': return 0.8;
        case 'oak': return 0.8;
        case 'bush': return 3.0;
        case 'cactus': return 1.5;
        case 'hedge': return 1.5;
        default: return 0.5;
    }
};

// Helper to check modification with float precision (reused from V2, robust)
const isTreeModified = (type: TreeType): boolean => {
    if (!previewGame || !previewGame.generator) return false;
    const current = previewGame.generator.config[type];
    const def = DEFAULT_TREE_CONFIG[type];
    // Deep comparison but handle floating point for flowerChance
    if (type === 'cactus') {
        if (Math.abs(current.flowerChance - def.flowerChance) > 0.001) return true;
    }
    // Check other props
    if (current.enabled !== def.enabled) return true;
    // Biomes sort check
    if (JSON.stringify([...current.biomes].sort()) !== JSON.stringify([...def.biomes].sort())) return true;
    if (current.minHeight !== def.minHeight) return true;
    if (current.maxHeight !== def.maxHeight) return true;
    return false;
};

const updateTreeResetButton = (type: TreeType, btn?: HTMLButtonElement) => {
    if (!btn) {
        const wrapper = document.getElementById(`tree-wrapper-${type}`);
        btn = wrapper?.querySelector(`.btn-smart-reset`) as HTMLButtonElement;
    }
    if (!btn) return;

    if (isTreeModified(type)) {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btn.style.background = "#d32f2f"; // Red
        btn.style.borderColor = "#b71c1c";
        btn.style.color = "white";
        btn.title = "Modified - Click to Reset";
        btn.style.cursor = "pointer";
    } else {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btn.style.background = "#FBC02D"; // Yellow
        btn.style.borderColor = "#F9A825";
        btn.style.color = "#333";
        btn.title = "Default Settings";
        btn.style.cursor = "default";
    }
};

const renderTreeSettings = () => {
    const container = document.getElementById('tree-settings-dropdown-container');
    if (!container || !previewGame || !previewGame.generator) return;

    // Helper to Update Global Reset Button (Moved to top of scope)
    const updateGlobalResetButton = () => {
        const btn = document.getElementById('tree-settings-reset-all');
        if (!btn || !previewGame || !previewGame.generator) return;

        let isModified = false;
        const config = previewGame.generator.config;
        for (const t of Object.keys(config) as TreeType[]) {
            if (isTreeModified(t)) {
                isModified = true;
                break;
            }
        }

        if (isModified) {
            btn.classList.remove('default');
            btn.classList.add('modified');
            btn.title = "Reset All to Default";
        } else {
            btn.classList.add('default');
            btn.classList.remove('modified');
            btn.title = "All Default";
        }
    };

    // 1. Dropdown Header
    let headerRow = document.getElementById('tree-settings-header');
    if (!headerRow) {
        headerRow = document.createElement('div');
        headerRow.id = 'tree-settings-header';
        headerRow.style.alignItems = 'center';
        headerRow.style.marginBottom = '5px';
        container.appendChild(headerRow);

        // Toggle Button
        const btnToggle = document.createElement('button');
        btnToggle.id = 'tree-settings-toggle';
        btnToggle.className = 'btn-small';
        btnToggle.style.flex = '1';
        btnToggle.style.textAlign = 'left';
        btnToggle.style.marginRight = '5px';
        btnToggle.onclick = () => {
            isTreeSettingsOpen = !isTreeSettingsOpen;
            renderTreeSettings();
            // Ensure button state is consistent when toggling
            setTimeout(updateGlobalResetButton, 0);
        };
        headerRow.appendChild(btnToggle);

        // Global Reset (Right of Toggle)
        const btnResetAll = document.createElement('button');
        btnResetAll.id = 'tree-settings-reset-all'; // Add ID
        btnResetAll.className = 'btn-smart-reset default';
        btnResetAll.style.width = '24px';
        btnResetAll.style.height = '24px';
        btnResetAll.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

        btnResetAll.onclick = (e) => {
            e.stopPropagation();
            if (previewGame && previewGame.generator) {
                previewGame.generator.config = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG));
                refreshPreview();
                renderTreeSettings();
            }
        };
        headerRow.appendChild(btnResetAll);
    }

    // Update Toggle Text
    const btnToggle = document.getElementById('tree-settings-toggle');
    if (btnToggle) {
        const arrow = isTreeSettingsOpen ? '▼' : '▶';
        btnToggle.innerHTML = `<span>Tree Settings</span> <span>${arrow}</span>`;
    }

    // 2. Content List
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
        list.style.overflowY = 'auto'; // Internal scroll
        list.style.borderLeft = '2px solid #555';
        list.style.paddingLeft = '5px';
        container.appendChild(list);
    }
    list.style.display = 'block';

    const config = previewGame.generator.config;
    (Object.keys(config) as TreeType[]).forEach(type => {
        // Helper to get fresh config object (since interactions replace the generator)
        const getFreshItem = () => previewGame!.generator!.config[type];
        const item = getFreshItem(); // Initial reference for rendering logic only

        // 3. Wrapper
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
                    <!-- Icon -->
                    <div class="icon-container" style="width:100px; height:100px; background:rgba(255,255,255,0.05); border-radius:4px; flex: 0 0 100px; display:flex; justify-content:center; align-items:center; overflow:hidden;">
                        <canvas id="icon-${type}" width="100" height="100"></canvas>
                    </div>
                    
                    <!-- Controls -->
                    <div style="flex:1; display:flex; flex-direction:column; gap:8px;">
                        
                        <!-- Top: Checkbox + Name + Reset -->
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <label style="display:flex; align-items:center; gap:8px; font-weight:bold; font-size:1.1em; cursor:pointer;">
                                <input type="checkbox" id="cb-${type}" style="width:18px; height:18px;">
                                ${type.charAt(0).toUpperCase() + type.slice(1)}
                            </label>
                            
                            <!-- Reset Button (Right) -->
                            <button class="btn-smart-reset" id="reset-${type}" title="Reset"></button>
                        </div>
                        
                        <!-- Biomes -->
                        <div id="biomes-${type}" style="display:flex; flex-wrap:wrap; gap:4px;"></div>
                    </div>
                </div>

                <div class="tree-details" style="display:flex; flex-direction:column; gap:10px; margin-top:5px;">
                     <!-- Height Dual Slider -->
                     <div style="display:flex; align-items:center; gap:5px;">
                        <span style="font-size:0.9em; width:50px;">Height:</span>
                        <input type="number" id="h-min-${type}" style="width:50px; padding:4px; background:rgba(0,0,0,0.5); border:1px solid #555; color:white;">
                        
                        <!-- Dual Slider Container -->
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

            // Icon Animation Logic (Start once)
            const ctx = (wrapper.querySelector(`#icon-${type}`) as HTMLCanvasElement).getContext('2d');
            if (ctx) {
                const drawIcon = () => {
                    if (!previewGame || !previewGame.generator) return;
                    ctx.clearRect(0, 0, 100, 100);
                    const h = Math.floor(previewGame!.generator.config[type].minHeight + Math.random() * (previewGame!.generator.config[type].maxHeight - previewGame!.generator.config[type].minHeight));
                    const flowerChance = previewGame!.generator.config[type].flowerChance;

                    const scale = getTreeIconScale(type);

                    // Create temp tree to get dims
                    const t = new Tree(0, type, h, flowerChance);

                    // Center in 100x100
                    // Tree draws from (0,0) down to (width, height) at (x,y)
                    // We want the VISUAL center of the tree to be at 50,50
                    const scaledW = t.width * scale;
                    const scaledH = t.height * scale;

                    const tx = 50 - (scaledW / 2);
                    const ty = 50 + (scaledH / 2);

                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.scale(scale, scale);

                    // Force X to 0 so it draws at origin of context
                    t.x = 0;
                    t.draw(ctx, 0);
                    ctx.restore();
                };
                drawIcon();
                const interval = window.setInterval(drawIcon, 1000);
                iconIntervals.push(interval);
            }

            // Bind Reset
            const resetBtn = wrapper.querySelector(`#reset-${type}`) as HTMLButtonElement;
            resetBtn.onclick = () => {
                if (isTreeModified(type)) {
                    if (previewGame && previewGame.generator) {
                        previewGame.generator.config[type] = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG[type]));
                        refreshPreview();
                        renderTreeSettings();
                    }
                }
            };
        }

        // 4. Update Values

        // Checkbox
        const cb = wrapper!.querySelector(`#cb-${type}`) as HTMLInputElement;
        if (cb.checked !== item.enabled) cb.checked = item.enabled;
        cb.onchange = (e) => {
            getFreshItem().enabled = (e.target as HTMLInputElement).checked;
            updateTreeResetButton(type);
            refreshPreview();
        };

        updateTreeResetButton(type);

        // Biomes
        const biomesContainer = wrapper!.querySelector(`#biomes-${type}`) as HTMLElement;
        const allBiomes: BiomeType[] = ['forest', 'desert', 'tundra', 'plains', 'city'];
        if (biomesContainer.children.length === 0) {
            allBiomes.forEach(biome => {
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
                    refreshPreview(); // Instant Refresh
                    renderTreeSettings(); // To update color
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

        // Dual Slider Logic
        const minInp = wrapper!.querySelector(`#h-min-${type}`) as HTMLInputElement;
        const maxInp = wrapper!.querySelector(`#h-max-${type}`) as HTMLInputElement;
        const sliderMinEl = wrapper!.querySelector(`#slider-min-${type}`) as HTMLInputElement;
        const sliderMaxEl = wrapper!.querySelector(`#slider-max-${type}`) as HTMLInputElement;
        const track = wrapper!.querySelector(`#track-${type}`) as HTMLElement;

        // Determine Dynamic Range based on Defaults
        const def = DEFAULT_TREE_CONFIG[type];
        const rangeMin = Math.floor(def.minHeight * 0.8);
        const rangeMax = Math.ceil(def.maxHeight * 1.2);
        const rangeSpan = rangeMax - rangeMin;

        sliderMinEl.min = rangeMin.toString();
        sliderMinEl.max = rangeMax.toString();
        sliderMaxEl.min = rangeMin.toString();
        sliderMaxEl.max = rangeMax.toString();

        // Visual Update Helper
        const updateVisuals = () => {
            const fresh = getFreshItem();
            const v1 = fresh.minHeight;
            const v2 = fresh.maxHeight;

            // Inputs show actual values
            if (document.activeElement !== minInp) minInp.value = v1.toString();
            if (document.activeElement !== maxInp) maxInp.value = v2.toString();

            // Sliders show clamped values (visual only)
            if (document.activeElement !== sliderMinEl) sliderMinEl.value = Math.max(rangeMin, Math.min(rangeMax, v1)).toString();
            if (document.activeElement !== sliderMaxEl) sliderMaxEl.value = Math.max(rangeMin, Math.min(rangeMax, v2)).toString();

            // Track
            let p1 = Math.max(0, Math.min(100, ((v1 - rangeMin) / rangeSpan) * 100));
            let p2 = Math.max(0, Math.min(100, ((v2 - rangeMin) / rangeSpan) * 100));

            // Fix: visual offset for thumb width (approx 16px)
            // If p1 is 0%, standard input has thumb center at 8px (approx).
            // We want green bar to start at 8px?
            // Actually, if we just use standard % left, it starts at 0px.
            // If we want exact center alignment:
            // CSS: left: calc(p1% + offset)
            // Simpler: Just rely on % but clamp nicely.
            // If the user says "green fill behind dot", maybe they mean the bar extends PAST the dot?
            // That happens if p2 is too high.
            // Let's stick to strict %. If it persists, we need CSS changes.
            // But wait, if v1=min, p1=0. Green bar starts at 0. Thumb center is at ~8px.
            // So green bar starts 8px to the LEFT of the thumb center. That might be the "behind" issue on the left side.
            // Same for right side.
            // To fix: p1 should be `calc(p1% + ...)`?
            // Actually, if we use % for both, they align.
            // Is the thumb transparent?

            // Track Visuals (Accounting for 16px thumb width)
            const p1Val = Math.max(0, Math.min(100, ((v1 - rangeMin) / rangeSpan) * 100));
            const p2Val = Math.max(0, Math.min(100, ((v2 - rangeMin) / rangeSpan) * 100));

            track.style.left = `calc(${p1Val}% + 8px - ${p1Val * 0.16}px)`;
            track.style.width = `calc(${p2Val - p1Val}% - ${(p2Val - p1Val) * 0.16}px)`;
        };

        updateVisuals();

        // Events
        // Events - Decoupled to fix overwrite issues
        const updateFromMinSlider = () => {
            let v1 = parseInt(sliderMinEl.value);
            const fresh = getFreshItem();
            // Clamp against current MAX (config, not slider)
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
            // Clamp against current MIN
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
            // Allow any value, just ensure logical consistency (min <= max)
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

        // Flower Chance
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

            // Sync UI
            const currentPct = (item.flowerChance * 100).toFixed(1);
            if (document.activeElement !== fInp) fInp.value = currentPct;
            fVal.innerText = currentPct + "%";

            fInp.oninput = (e) => {
                const val = parseFloat((e.target as HTMLInputElement).value);
                getFreshItem().flowerChance = val / 100;

                fVal.innerText = val.toFixed(1) + "%";

                updateTreeResetButton(type);
                updateGlobalResetButton();
                refreshPreview();
            };
        } else {
            extraContainer.innerHTML = '';
        }
    });

    // Initial Global Reset Button Update
    updateGlobalResetButton();
};

// Hook into OpenCustomGen
// We'll modify openCustomGen logic below or inject it.
// Actually, I can just modify the existing `openCustomGen` function if I have access to the file content.
// OR I call `renderTreeSettings()` after opening.


// Reset Confirmation Logic
let isResetConfirming = false;

// Clear Confirm state on interaction with other elements
const cancelResetConfirm = () => {
    if (isResetConfirming) {
        isResetConfirming = false;
        btnGenReset.innerText = "Reset Default";
        btnGenReset.style.background = "#c62828";
    }
};

btnGenReset.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent clearing itself
    if (isResetConfirming) {
        // Confirmed
        const randomSeed = Math.floor(Math.random() * 100000).toString();

        // Update Input
        const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
        if (customSeedInput) customSeedInput.value = randomSeed;

        if (previewGame) {
            previewGame.setSeed(randomSeed);
            // Reset Tree Config to Defaults
            if (previewGame.generator) {
                const def = JSON.parse(JSON.stringify(DEFAULT_TREE_CONFIG));
                previewGame.generator.config = def;
                previewGame.treeConfig = JSON.parse(JSON.stringify(def)); // Sync Game config too!
            }
        }

        // Re-render UI to show defaults
        renderTreeSettings();

        // Reset Logic - Maybe reset other params too in future
        cancelResetConfirm();
    } else {
        // First click
        isResetConfirming = true;
        btnGenReset.innerText = "Confirm Reset?";
        btnGenReset.style.background = "#8b0000"; // Darker Red
    }
});

// Cancel reset confirm if clicking apply or close or ANY control in window
customGenWindow.addEventListener('click', (e) => {
    if (e.target !== btnGenReset) cancelResetConfirm();
});

// Apply Logic
btnGenApply.addEventListener('click', () => {
    cancelResetConfirm();
    const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;

    // 1. Save Config
    if (previewGame && previewGame.generator) {
        game.treeConfig = JSON.parse(JSON.stringify(previewGame.generator.config));
    }

    // 2. Set seed & Reset Game (which uses new treeConfig)
    if (seed) game.setSeed(seed);
    else game.setSeed(game.getSeed()); // Just reload if no new seed, to apply config
});
btnGenClose.addEventListener('click', () => {
    cancelResetConfirm();
    customGenWindow.classList.remove('visible');
});

// Seed input Enter support
const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
customSeedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        refreshPreview();
    }
});

/* btnGenPreview removed */

// 1c. Speed Slider (Logarithmic)
// Input: -1 to 1. Output: 0.1 to 10. Center: 0 -> 1.
const getSpeedFromSlider = (val: number) => {
    // 10^val maps [-1, 1] -> [0.1, 10]
    return Math.pow(10, val);
};
const getSliderFromSpeed = (val: number) => {
    return Math.log10(val);
};

const updateSpeed = (speed: number) => {
    // Clamp
    speed = Math.max(0.1, Math.min(10, speed));

    // Update Slider UI
    // Avoid double firing?
    const sliderVal = getSliderFromSpeed(speed);
    // Only update slider if not currently being dragged closely? 
    // Actually exact sync is fine
    if (document.activeElement !== speedSlider) {
        speedSlider.value = sliderVal.toString();
    }

    // Update Game
    (game as any).setTimeScale?.(speed);
};

speedSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    // Snap to center
    if (Math.abs(val) < 0.05) {
        speedSlider.value = "0";
        updateSpeed(1.0);
    } else {
        updateSpeed(getSpeedFromSlider(val));
    }
});
speedSlider.addEventListener('dblclick', () => {
    speedSlider.value = "0";
    updateSpeed(1.0);
});


// 2. Sound
let isMuted = false;
let volume = 0.5; // Default 50%
const svgSpeaker = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
const svgMuted = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;

btnSound.addEventListener('click', () => {
    isMuted = !isMuted;
    const icon = btnSound.querySelector('svg');
    if (icon) {
        // Replace inner SVG or path? Easier to replace SVG content or whole SVG
        btnSound.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${isMuted ? svgMuted : svgSpeaker}</svg>`;
    }
    (game as any).setMuted?.(isMuted);
});

// Sound Hover Logic (Wrapper)
soundContainer.addEventListener('mouseenter', () => {
    volumePopup.style.display = 'block';
});
soundContainer.addEventListener('mouseleave', () => {
    volumePopup.style.display = 'none';
});

volumeSlider.addEventListener('input', (e) => {
    volume = parseFloat((e.target as HTMLInputElement).value);
    (game as any).setVolume?.(volume);
});

// 3. Terminal
const toggleTerminal = () => {
    const isVis = terminalBar.style.display === 'flex';
    terminalBar.style.display = isVis ? 'none' : 'flex';
    if (!isVis) {
        terminalInput.focus();
    }
};
btnTerminal.addEventListener('click', toggleTerminal);

// Init Volume UI
volumeSlider.value = volume.toString();
// Defer game volume set slightly to ensure game init? 
// Or just call it, optional chaining protects us
setTimeout(() => {
    (game as any).setVolume?.(volume);
}, 100);

// Shortcuts
window.addEventListener('keydown', (e) => {
    // Ignore if typing in an input (unless Esc)
    if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') (document.activeElement as HTMLElement).blur();
        return;
    }

    if (e.key === 'f') {
        toggleFullscreen();
    } else if (e.key === 'g') {
        // Toggle Gen Window
        if (customGenWindow.classList.contains('visible')) {
            cancelResetConfirm();
            customGenWindow.classList.remove('visible');
        } else {
            openCustomGen();
        }
    } else if (e.key === 'r') {
        const newSeed = Math.floor(Math.random() * 100000).toString();
        game.setSeed(newSeed);
    } else if (e.key === 's') {
        toggleWindow(settingsWindow);
    } else if (e.key === 'a') {
        // Toggle Advanced
        if (advancedWindow.classList.contains('visible')) {
            advancedWindow.classList.remove('visible');
        } else {
            settingsWindow.classList.remove('visible'); // Close settings
            advancedWindow.classList.add('visible');
        }
    } else if (e.key === 'm') {
        btnSound.click();
    } else if (e.key === 't') {
        e.preventDefault();
        toggleTerminal();
    } else if (e.key === 'Escape') {
        // Priority Close
        if (document.fullscreenElement) {
            // Let default Esc handle fullscreen exit
        }

        // Close Windows in order of priority
        if (customGenWindow.classList.contains('visible')) {
            cancelResetConfirm();
            customGenWindow.classList.remove('visible');
        } else if (advancedWindow.classList.contains('visible')) {
            advancedWindow.classList.remove('visible');
        } else if (settingsWindow.classList.contains('visible')) {
            settingsWindow.classList.remove('visible');
        } else if (document.pointerLockElement) {
            document.exitPointerLock();
        } else if (terminalBar.style.display === 'flex') {
            toggleTerminal();
        }
    }
});

// Mouse Gestures (Speed) - Pointer Lock
let isDragging = false;
let currentSpeedLog = 0; // Log value
const MAX_LOG = 1; // 10^1 = 10
const MIN_LOG = -1; // 10^-1 = 0.1

window.addEventListener('mousedown', (e) => {
    // Only verify on MAIN canvas
    if ((e.target as HTMLElement).id === 'game-canvas') {
        // Hold detection
        const holdTimer = setTimeout(() => {
            isDragging = true;
            canvas.requestPointerLock();

            // Initial value from slider (log value)
            currentSpeedLog = parseFloat(speedSlider.value);

            gestureContainer.style.display = 'block';
            gestureContainer.style.left = e.clientX + 'px';
            gestureContainer.style.top = (e.clientY - 50) + 'px'; // Centered above
        }, 200);

        const cancelHold = () => {
            clearTimeout(holdTimer);
            window.removeEventListener('mouseup', cancelHold);
        };
        window.addEventListener('mouseup', cancelHold);
    }
});

document.addEventListener('mousemove', (e) => {
    if (isDragging && document.pointerLockElement === canvas) {
        // Pointer lock movement
        const dx = e.movementX;

        // Sensitivity (resistance)
        // User asked for "slowed down" cursor movement feeling, pointer lock gives infinite canvas
        // We just scale the dx significantly
        const sensitivity = 0.005;
        currentSpeedLog += dx * sensitivity;
        currentSpeedLog = Math.max(MIN_LOG, Math.min(MAX_LOG, currentSpeedLog));

        const newSpeed = getSpeedFromSlider(currentSpeedLog);

        // Update slider visually (bypass guard)
        speedSlider.value = currentSpeedLog.toString();
        (game as any).setTimeScale?.(newSpeed);

        gestureSpeedVal.innerText = newSpeed.toFixed(2) + 'x';

        // Visual bar logic (-1 to 1 -> 0% to 100%)
        const percent = ((currentSpeedLog - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100;
        gestureBar.style.width = percent + '%';
        // Color gradient for fanciness?
        gestureBar.style.backgroundColor = `hsl(${percent}, 70%, 50%)`;
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        document.exitPointerLock();
        gestureContainer.style.display = 'none';
    }
});

window.addEventListener('dblclick', (e) => {
    if ((e.target as HTMLElement).tagName === 'CANVAS') {
        updateSpeed(1.0);
        speedSlider.value = "0";
    }
});

// Scroll Volume (Global on window logic?)
// User said: "always manipulate volume when the user scrolls, so wherever i am"
window.addEventListener('wheel', (e) => {
    // Maybe exclude if hovering a scrollable div?
    // Check if target is inside Settings or Custom Gen?
    const target = e.target as HTMLElement;
    if (target.closest('.ui-window')) return; // Don't hijack window scrolling if any (tho overflow hidden)

    if (e.deltaY < 0) {
        volume = Math.min(1, volume + 0.05);
    } else {
        volume = Math.max(0, volume - 0.05);
    }
    volumeSlider.value = volume.toString();
    (game as any).setVolume?.(volume);

    // Visual Bar Logic
    const volContainer = document.getElementById('volume-visual-container');
    const volBar = document.getElementById('volume-visual-bar');

    if (!volContainer && document.body) {
        // Lazy inject
        const c = document.createElement('div');
        c.id = 'volume-visual-container';
        const b = document.createElement('div');
        b.id = 'volume-visual-bar';
        c.appendChild(b);
        document.body.appendChild(c);

        // Re-get for safety in this closure?
        // Actually we can just use c and b direct
        c.classList.add('visible');
        b.style.height = (volume * 100) + '%';

        // Auto fade out
        (window as any).volFadeTimer = setTimeout(() => {
            c.classList.remove('visible');
        }, 1500);
    } else if (volContainer && volBar) {
        volContainer.classList.add('visible');
        volBar.style.height = (volume * 100) + '%';

        clearTimeout((window as any).volFadeTimer);
        (window as any).volFadeTimer = setTimeout(() => {
            volContainer.classList.remove('visible');
        }, 1500);
    }
});

// Żadna komórka mózgowa nie ucierpiała w produkcji tego czegoś. Całość kodu jest dziełem pióra bazyliszka. Zielone to nie commity, to reprezentacyjna ilość gibrzdyli zutylizowanych w procesie twórczym.