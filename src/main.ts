import { deepClone } from './utils/deepClone';
import './style.css'

// Non-blocking HUD toast for uncaught errors. Replaces a modal alert()
// that used to spam users on any production exception. The toast lives
// for 4 s, debounced — repeated errors collapse into one visible message.
function showErrorToast(message: string) {
    let toast = document.getElementById('error-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'error-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout((toast as HTMLElement & { _hideTimer?: number })._hideTimer);
    (toast as HTMLElement & { _hideTimer?: number })._hideTimer = window.setTimeout(() => {
        toast?.classList.remove('visible');
    }, 4000);
}

window.addEventListener('error', (event) => {
    console.error('Runtime error:', event.error ?? event.message, event.filename, event.lineno);
    showErrorToast(`Error: ${event.message}`);
});
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
    showErrorToast(`Promise rejected: ${event.reason}`);
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
        <input type="range" id="volume-slider" min="0" max="100" step="1" value="50" orient="vertical">
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

        <div class="setting-group" style="margin-top:20px;">
          <div class="row" style="align-items: center; justify-content: space-between;">
             <label style="margin-right: 10px;">Speed</label>
              <div style="flex: 1; display: flex; align-items: center; gap: 10px;">
                  <input type="range" id="adv-speed-slider" min="0" max="1000" step="1" value="500" style="flex: 1;">
                  <input type="text" id="adv-speed-input" style="width: 80px; padding: 4px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: white; text-align: center;" value="1.0">
             </div>
             <button id="btn-reset-adv-speed" class="btn-smart-reset default" title="Reset to Default" style="margin-left: 10px;">
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
             <label style="color:white; font-size:0.9em; font-weight:bold; margin-right:10px; display:flex; align-items:center; gap:5px;">Biome: 
                 <select id="custom-biome-select" style="background:rgba(0,0,0,0.5); color:white; border:1px solid #555; padding:3px; border-radius:3px; font-size: 0.9em;">
                     <option value="auto">Auto (Seed)</option>
                     <option value="forest">Forest</option>
                     <option value="desert">Desert</option>
                     <option value="tundra">Tundra</option>
                     <option value="plains">Plains</option>
                     <option value="city">City</option>
                 </select>
             </label>
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
  <div id="terminal-output-container"></div>
  <div id="terminal-bar">
    <div id="terminal-hints-container" style="position: absolute; bottom: 100%; left: -1px; width: calc(100% + 2px); padding: 6px 10px; display: none; gap: 10px; background: rgba(10,10,15,0.95); border: 1px solid #336; border-bottom: none; z-index: 10001; font-family: monospace; overflow-x: auto; white-space: nowrap; box-sizing: border-box;"></div>
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

const initialSeed = Math.floor(Math.random() * 100000).toString();
game.setSeed(initialSeed);
game.start();

const seedInput = document.getElementById('seed-input') as HTMLInputElement;
const setSeedBtn = document.getElementById('set-seed-btn') as HTMLButtonElement;
const randomSeedBtn = document.getElementById('random-seed-btn') as HTMLButtonElement;

const uiSeedVal = document.getElementById('ui-seed-val');
const uiTimeVal = document.getElementById('ui-time-val');

function copyToClipboard(element: HTMLElement | null, textFn: () => string) {
    if (!element) return;
    element.addEventListener('click', () => {
        const text = textFn();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            element.style.color = "#4CAF50";
            setTimeout(() => {
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

    const isDefault = current === '24h';
    updateResetButton(btnResetTimeFmt, isDefault);
}

updateTimeFormatUI();


btnAdvanced.addEventListener('click', () => {
    settingsWindow.classList.remove('visible');
    const isVis = advancedWindow.classList.contains('visible');

    if (isVis) {
        advancedWindow.classList.remove('visible');
    } else {
        updateTimeFormatUI();
        advancedWindow.classList.add('visible');
        cancelAdvResetConfirm();
    }
});

timeFmtButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const val = btn.dataset.val as '24h' | '12h' | 'score';
        game.timeFormat = val;
        updateTimeFormatUI();
    });
});

btnResetTimeFmt.addEventListener('click', () => {
    if (btnResetTimeFmt.classList.contains('modified')) {
        game.timeFormat = '24h';
        updateTimeFormatUI();
    }
});

const advSpeedSlider = document.getElementById('adv-speed-slider') as HTMLInputElement;
const advSpeedInput = document.getElementById('adv-speed-input') as HTMLInputElement;
const btnResetAdvSpeed = document.getElementById('btn-reset-adv-speed')!;

// Set when the standard speed slider registers `updateSpeed` further down.
let globalSpeedUpdateCallback: ((spd: number) => void) | null = null;

let currentAdvSpeedCenter: number = 1.0;

const getAdvSpeedFromSlider = (sliderVal: number, center: number): number => {
    let minS = center - 10;
    let maxS = center + 10;
    if (center === 1.0) { minS = -1.0; maxS = 20.0; }

    // When the range straddles the 0..1 "useful" window, dedicate the lower
    // 10% of the slider to negative values and the next 40% to 0..1 so the
    // normal-speed band is easier to hit.
    if (minS < 0 && maxS > 1) {
        if (sliderVal >= 500) {
            const pct = (sliderVal - 500) / 500;
            return 1 + ((maxS - 1) * pct);
        } else if (sliderVal >= 100) {
            const pct = (sliderVal - 100) / 400;
            return 0 + (1 * pct);
        } else {
            const pct = sliderVal / 100;
            return minS + ((0 - minS) * pct);
        }
    } else {
        const pct = sliderVal / 1000;
        return minS + ((maxS - minS) * pct);
    }
};

const getSliderFromAdvSpeed = (speed: number, center: number): number => {
    let minS = center - 10;
    let maxS = center + 10;
    if (center === 1.0) { minS = -1.0; maxS = 20.0; }

    if (minS < 0 && maxS > 1) {
        if (speed >= 1) {
            const pct = (speed - 1) / (maxS - 1);
            return 500 + (500 * pct);
        } else if (speed >= 0) {
            const pct = speed / 1;
            return 100 + (400 * pct);
        } else {
            const pct = (speed - minS) / (0 - minS);
            return 0 + (100 * pct);
        }
    } else {
        const pct = (speed - minS) / (maxS - minS);
        return 0 + (1000 * pct);
    }
};

const updateAdvSpeedUI = (forceCenter?: boolean) => {
    const spd = game.timeScale;

    if (document.activeElement !== advSpeedSlider) {
        let minS = currentAdvSpeedCenter - 10;
        let maxS = currentAdvSpeedCenter + 10;
        if (currentAdvSpeedCenter === 1.0) { minS = -1.0; maxS = 20.0; }

        // Recenter when forced (typed value, terminal) or when current speed
        // would otherwise fall outside the slider's visible band.
        if (forceCenter || spd < minS || spd > maxS) {
            currentAdvSpeedCenter = spd;
        }

        const rawSliderVal = getSliderFromAdvSpeed(spd, currentAdvSpeedCenter);
        advSpeedSlider.value = Math.round(rawSliderVal).toString();
    }

    if (document.activeElement !== advSpeedInput) {
        advSpeedInput.value = Number.isInteger(spd) ? spd.toString() : parseFloat(spd.toFixed(1)).toString();
    }

    const isDefault = spd === 1.0;
    updateResetButton(btnResetAdvSpeed, isDefault);
};

const executeAdvSpeedSet = (val: number, recenter: boolean) => {
    const clamped = Math.max(-10000, Math.min(10000, val));
    if (recenter) {
        currentAdvSpeedCenter = clamped;
    }
    game.setTimeScale(clamped);
    updateAdvSpeedUI(recenter);
    if (globalSpeedUpdateCallback) globalSpeedUpdateCallback(clamped);
};

const applyAdvInputText = (valStr: string) => {
    try {
        const val = Function(`
            "use strict";
            const { ${Object.getOwnPropertyNames(Math).join(', ')} } = Math;
            return (${valStr});
        `)();
        if (typeof val === 'number' && !isNaN(val)) {
            executeAdvSpeedSet(val, true);
        }
    } catch (e) { }
};

advSpeedSlider.addEventListener('input', (e) => {
    const sliderVal = parseFloat((e.target as HTMLInputElement).value);
    const speed = getAdvSpeedFromSlider(sliderVal, currentAdvSpeedCenter);
    executeAdvSpeedSet(speed, false);
});

advSpeedInput.addEventListener('change', (e) => {
    applyAdvInputText((e.target as HTMLInputElement).value);
});

advSpeedInput.addEventListener('keydown', (e) => {
    // Blurring triggers the `change` listener, which applies the value.
    if (e.key === 'Enter') advSpeedInput.blur();
});

btnResetAdvSpeed.addEventListener('click', () => {
    if (btnResetAdvSpeed.classList.contains('modified')) {
        currentAdvSpeedCenter = 1.0;
        executeAdvSpeedSet(1.0, false);
    }
});

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
        game.timeFormat = '24h';
        updateTimeFormatUI();

        currentAdvSpeedCenter = 1.0;
        executeAdvSpeedSet(1.0, false);

        cancelAdvResetConfirm();
    } else {
        isAdvResetConfirming = true;
        btnAdvReset.innerText = "Are you sure?";
        btnAdvReset.style.background = "#d32f2f";
        setTimeout(cancelAdvResetConfirm, 3000);
    }
});

let currentVolume = 50;
let lastVolume = 50;
let isMuted = false;

const setGlobalVolume = (val: number, fromMuteToggle = false) => {
    if (!fromMuteToggle) {
        if (val > 0) {
            currentVolume = val;
            lastVolume = val;
            isMuted = false;
        } else {
            currentVolume = 0;
            isMuted = true;
        }
    } else {
        if (isMuted) {
            isMuted = false;
            currentVolume = lastVolume || 50;
        } else {
            isMuted = true;
            if (currentVolume > 0) lastVolume = currentVolume;
            currentVolume = 0;
        }
    }

    volumeSlider.value = currentVolume.toString();
    game.setVolume(currentVolume / 100);
    game.setMuted(isMuted);

    const icon = document.getElementById('icon-sound');
    if (icon) {
        if (isMuted) {
            icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
        } else {
            icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
        }
    }
};


advancedWindow.addEventListener('click', (e) => {
    if (e.target !== btnAdvReset) cancelAdvResetConfirm();
});

btnAdvClose.addEventListener('click', () => {
    cancelAdvResetConfirm();
    advancedWindow.classList.remove('visible');
});
const btnFullscreen = document.getElementById('btn-fullscreen')!;
const btnCustomGen = document.getElementById('btn-custom-gen')!;
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

const customGenWindow = document.getElementById('custom-gen-window')!;
const btnGenClose = document.getElementById('btn-gen-close')!;
const btnGenApply = document.getElementById('btn-gen-apply')!;
const btnGenReset = document.getElementById('btn-gen-reset')!;

const terminalBar = document.getElementById('terminal-bar')!;
const terminalInput = document.getElementById('terminal-input') as HTMLInputElement;

const gestureContainer = document.getElementById('gesture-slider-container')!;
const gestureSpeedVal = document.getElementById('gesture-speed-val')!;
const gestureBar = document.getElementById('gesture-slider-bar')!;

const toggleWindow = (el: HTMLElement) => {
    const isVisible = el.classList.contains('visible');
    if (isVisible) el.classList.remove('visible');
    else el.classList.add('visible');
    return !isVisible;
};

btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWindow(settingsWindow);
});

// Close settings when clicking outside its container.
window.addEventListener('click', (e) => {
    if (settingsWindow.classList.contains('visible')) {
        if (!settingsWindow.contains(e.target as Node) && !btnSettings.contains(e.target as Node)) {
            settingsWindow.classList.remove('visible');
        }
    }
});

const toggleFullscreen = () => {
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).mozFullScreenElement && !(document as any).msFullscreenElement) {
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
            (document.documentElement as any).webkitRequestFullscreen(); // Chrome/Safari Base
        } else if ((document.documentElement as any).mozRequestFullScreen) {
            (document.documentElement as any).mozRequestFullScreen(); // Firefox
        } else if ((document.documentElement as any).msRequestFullscreen) {
            (document.documentElement as any).msRequestFullscreen(); // IE/Edge
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    }
};
btnFullscreen.addEventListener('click', toggleFullscreen);

let previewGame: Game | null = null;
const previewCanvas = document.getElementById('gen-preview-canvas') as HTMLCanvasElement;

const openCustomGen = () => {
    const seedInp = document.getElementById('custom-seed-input') as HTMLInputElement;
    if (seedInp) {
        seedInp.value = game.getSeed();
    }
    if (customGenWindow.classList.contains('visible')) {
        customGenWindow.classList.remove('visible');
        return;
    }

    settingsWindow.classList.remove('visible');
    customGenWindow.classList.add('visible');

    if (!previewGame) {
        previewGame = new Game(previewCanvas, true);
        previewGame.resize();
    }

    previewGame.start();
    renderTreeSettings();
};
btnCustomGen.addEventListener('click', openCustomGen);
btnGenClose.addEventListener('click', () => {
    customGenWindow.classList.remove('visible');
    iconIntervals.forEach(i => clearInterval(i));
    // Tear down preview game so its rAF loop and resize handler don't leak.
    if (previewGame) {
        previewGame.dispose();
        previewGame = null;
    }
    cancelResetConfirm();
});

btnGenApply.addEventListener('click', () => {
    cancelResetConfirm();
    const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;

    if (previewGame && previewGame.generator) {
        game.treeConfig = deepClone(previewGame.generator.config);
    }

    // Apply seed (or reload current seed) so the new treeConfig takes effect.
    if (seed) game.setSeed(seed);
    else game.setSeed(game.getSeed());
});

import { DEFAULT_TREE_CONFIG } from './procgen/TreeConfig';
import type { TreeType } from './engine/Tree';
import type { BiomeType } from './procgen/BiomeSystem';

const treeSettingsContainer = document.getElementById('tree-settings-dropdown-container');

// Fallback: inject the container if the HTML template didn't already include it.
if (!treeSettingsContainer && customGenWindow) {
    const container = document.createElement('div');
    container.id = 'tree-settings-dropdown-container';
    container.style.marginTop = '20px';
    const buttons = customGenWindow.querySelector('.buttons');
    if (buttons) customGenWindow.insertBefore(container, buttons);
    else customGenWindow.appendChild(container);
}

let isTreeSettingsOpen = false;

import { Tree } from './engine/Tree';

// Track intervals to clear them on close to avoid leaking timers per icon.
const iconIntervals: number[] = [];

const refreshPreview = () => {
    if (previewGame && previewGame.generator) {
        // Keep the Game's config in sync with the in-progress generator config.
        previewGame.treeConfig = deepClone(previewGame.generator.config);

        const inp = document.getElementById('custom-seed-input') as HTMLInputElement;
        if (inp && inp.value) {
            previewGame.setSeed(inp.value);
        } else {
            previewGame.setSeed(previewGame.getSeed());
        }

        const bSelect = document.getElementById('custom-biome-select') as HTMLSelectElement;
        if (bSelect && bSelect.value !== 'auto') {
            previewGame.generator?.forceBiome(bSelect.value as BiomeType);
        }
    }
};
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

        // Preserve camera position across the regenerate so the user
        // doesn't get yanked back to the start of the world.
        let savedX = 0;
        if (previewGame) savedX = previewGame.getCameraX();

        refreshPreview();

        if (previewGame) previewGame.setCameraX(savedX);
    };
}

const customBiomeSelect = document.getElementById('custom-biome-select') as HTMLSelectElement;
if (customBiomeSelect) {
    customBiomeSelect.addEventListener('change', () => refreshPreview());
}


if (btnGenRefresh) {
    btnGenRefresh.onclick = () => refreshPreview();
}

if (btnGenPause) {
    btnGenPause.onclick = () => {
        if (!previewGame) return;
        if (previewGame.timeScale === 0) {
            previewGame.timeScale = parseFloat(genSpeedSlider.value) || 1.0;
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


// Target height: roughly 80-90px so the tree fills the 100x100 icon box.
const getTreeIconScale = (type: TreeType) => {
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

const isTreeModified = (type: TreeType): boolean => {
    if (!previewGame || !previewGame.generator) return false;
    const current = previewGame.generator.config[type];
    const def = DEFAULT_TREE_CONFIG[type];
    if (type === 'cactus') {
        // Float comparison: flowerChance is a 0..1 ratio so use an epsilon.
        if (Math.abs(current.flowerChance - def.flowerChance) > 0.001) return true;
    }
    if (current.enabled !== def.enabled) return true;
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
        btn.style.background = "#d32f2f";
        btn.style.borderColor = "#b71c1c";
        btn.style.color = "white";
        btn.title = "Modified - Click to Reset";
        btn.style.cursor = "pointer";
    } else {
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
        btn.style.background = "#FBC02D";
        btn.style.borderColor = "#F9A825";
        btn.style.color = "#333";
        btn.title = "Default Settings";
        btn.style.cursor = "default";
    }
};

const renderTreeSettings = () => {
    const container = document.getElementById('tree-settings-dropdown-container');
    if (!container || !previewGame || !previewGame.generator) return;

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
            // Re-evaluate the global reset button after the list re-renders.
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
        // Fetch the live config entry — handlers may replace the generator.
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

            const ctx = (wrapper.querySelector(`#icon-${type}`) as HTMLCanvasElement).getContext('2d');
            if (ctx) {
                const drawIcon = () => {
                    if (!previewGame || !previewGame.generator) return;
                    ctx.clearRect(0, 0, 100, 100);
                    const h = Math.floor(previewGame!.generator.config[type].minHeight + Math.random() * (previewGame!.generator.config[type].maxHeight - previewGame!.generator.config[type].minHeight));
                    const flowerChance = previewGame!.generator.config[type].flowerChance;

                    const scale = getTreeIconScale(type);

                    const t = new Tree(0, type, h, flowerChance);

                    // Tree draws from (0,0) down to (width, height) — translate
                    // so the visual centre of the tree lands at (50,50).
                    const scaledW = t.width * scale;
                    const scaledH = t.height * scale;

                    const tx = 50 - (scaledW / 2);
                    const ty = 50 + (scaledH / 2);

                    ctx.save();
                    ctx.translate(tx, ty);
                    ctx.scale(scale, scale);

                    t.x = 0;
                    t.draw(ctx, 0);
                    ctx.restore();
                };
                drawIcon();
                const interval = window.setInterval(drawIcon, 1000);
                iconIntervals.push(interval);
            }

            const resetBtn = wrapper.querySelector(`#reset-${type}`) as HTMLButtonElement;
            resetBtn.onclick = () => {
                if (isTreeModified(type)) {
                    if (previewGame && previewGame.generator) {
                        previewGame.generator.config[type] = deepClone(DEFAULT_TREE_CONFIG[type]);
                        refreshPreview();
                        renderTreeSettings();
                    }
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

        // Slider range is 80%-120% of the default so the slider stays useful
        // even after the user types extreme values into the number input.
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

            // Sliders visualise the clamped value even if the number input holds something extreme.
            if (document.activeElement !== sliderMinEl) sliderMinEl.value = Math.max(rangeMin, Math.min(rangeMax, v1)).toString();
            if (document.activeElement !== sliderMaxEl) sliderMaxEl.value = Math.max(rangeMin, Math.min(rangeMax, v2)).toString();

            // Track fill: 16px thumb width compensation so the green bar lines up with the dots.
            const p1Val = Math.max(0, Math.min(100, ((v1 - rangeMin) / rangeSpan) * 100));
            const p2Val = Math.max(0, Math.min(100, ((v2 - rangeMin) / rangeSpan) * 100));

            track.style.left = `calc(${p1Val}% + 8px - ${p1Val * 0.16}px)`;
            track.style.width = `calc(${p2Val - p1Val}% - ${(p2Val - p1Val) * 0.16}px)`;
        };

        updateVisuals();

        // Min/max handlers are split so that each handler clamps against the
        // other half's *config* value (not the other slider's clamped value).
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
            // Number input accepts any value; enforce min <= max only.
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

    updateGlobalResetButton();
};


let isResetConfirming = false;

const cancelResetConfirm = () => {
    if (isResetConfirming) {
        isResetConfirming = false;
        btnGenReset.innerText = "Reset Default";
        btnGenReset.style.background = "#c62828";
    }
};

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
                // Sync the Game-level config so the preview matches.
                previewGame.treeConfig = deepClone(def);
            }
        }

        renderTreeSettings();
        cancelResetConfirm();
    } else {
        isResetConfirming = true;
        btnGenReset.innerText = "Confirm Reset?";
        btnGenReset.style.background = "#8b0000";
    }
});

// Any click inside the window that's NOT the reset button cancels the
// two-click confirm flow.
customGenWindow.addEventListener('click', (e) => {
    if (e.target !== btnGenReset) cancelResetConfirm();
});

const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
customSeedInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        refreshPreview();
    }
});

// Logarithmic speed slider: input [-1, 1] -> output [0.1x, 10x], 0 -> 1x.
const getSpeedFromSlider = (val: number) => Math.pow(10, val);
const getSliderFromSpeed = (val: number) => Math.log10(val);

const updateSpeed = (speed: number) => {
    speed = Math.max(0.1, Math.min(10, speed));

    const sliderVal = getSliderFromSpeed(speed);
    if (document.activeElement !== speedSlider) {
        speedSlider.value = sliderVal.toString();
    }

    (game as any).setTimeScale?.(speed);

    if (typeof updateAdvSpeedUI === 'function') updateAdvSpeedUI(true);
};

globalSpeedUpdateCallback = (spd: number) => {
    // The base slider only covers 0.1..10. If the advanced speed is outside
    // that range, snap the base slider to 0 to signal "manual override".
    if (spd >= 0.1 && spd <= 10) {
        if (document.activeElement !== speedSlider) {
            speedSlider.value = getSliderFromSpeed(spd).toString();
        }
    } else {
        if (document.activeElement !== speedSlider) {
            speedSlider.value = "0";
        }
    }
};

speedSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    // Snap to centre so 1.0x is easy to hit.
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


btnSound.addEventListener('click', () => {
    setGlobalVolume(0, true);
});

soundContainer.addEventListener('mouseenter', () => {
    volumePopup.style.display = 'block';
});
soundContainer.addEventListener('mouseleave', () => {
    volumePopup.style.display = 'none';
});

volumeSlider.addEventListener('input', (e) => {
    setGlobalVolume(parseFloat((e.target as HTMLInputElement).value), false);
});

import { Terminal, type AutocompleteSuggestion } from './engine/Terminal';

const terminalOutputContainer = document.getElementById('terminal-output-container')!;
const terminalHintsContainer = document.getElementById('terminal-hints-container')!;

let terminalHintsList: AutocompleteSuggestion[] = [];
let terminalActiveHintIndex: number = -1;

const renderTerminalHints = () => {
    if (terminalHintsList.length === 0) {
        terminalHintsContainer.style.display = 'none';
        terminalHintsContainer.innerHTML = '';
        return;
    }
    terminalHintsContainer.style.display = 'flex';
    terminalHintsContainer.innerHTML = '';

    terminalHintsContainer.style.alignItems = 'center';

    terminalHintsList.forEach((hint, idx) => {
        const el = document.createElement('div');
        el.style.borderRadius = '4px';
        el.style.transition = 'all 0.1s ease-in-out';
        if (idx === terminalActiveHintIndex) {
            el.innerHTML = `
                <span style="font-weight:bold; font-size:1.05em; color:#fff;">${hint.value}</span>
                <span style="color:rgba(255,255,255,0.4); margin:0 6px;">|</span>
                <span style="font-size:0.9em; color:#00E676;">${hint.description}</span>
            `;
            el.style.background = 'rgba(0, 200, 80, 0.15)';
            el.style.color = '#fff';
            el.style.boxShadow = '0 2px 6px rgba(0, 200, 80, 0.2)';
            el.style.border = '1px solid rgba(0, 200, 80, 0.4)';
            el.style.padding = '4px 10px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.zIndex = '10';
            el.style.whiteSpace = 'nowrap';
        } else {
            el.innerText = hint.value;
            el.style.background = 'rgba(255, 255, 255, 0.1)';
            el.style.color = '#eee';
            el.style.padding = '4px 8px';
            el.style.border = '1px solid transparent';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
        }
        terminalHintsContainer.appendChild(el);
    });
};

const updateTerminalHints = () => {
    terminalHintsList = terminal.getSuggestions(terminalInput.value);
    terminalActiveHintIndex = -1;
    renderTerminalHints();
};

terminalInput.addEventListener('input', updateTerminalHints);

// Called by the Terminal after a command runs so the UI reflects any
// game-state changes that bypassed the normal UI handlers.
const syncUIFromTerminal = () => {
    if (globalSpeedUpdateCallback) globalSpeedUpdateCallback(game.timeScale);
    updateAdvSpeedUI();

    const gVol = Math.round(game.getVolume() * 100);
    if (currentVolume !== gVol) {
        setGlobalVolume(gVol, false);
    }

    const gMuted = game.getMuted();
    if (isMuted !== gMuted) {
        setGlobalVolume(0, true);
    }

    if (previewGame && previewGame.generator) {
        previewGame.generator.config = deepClone(game.treeConfig);
        previewGame.treeConfig = deepClone(game.treeConfig);
    }

    updateTimeFormatUI();
    if (customGenWindow.classList.contains('visible')) {
        renderTreeSettings();
        refreshPreview();
    }
};

const commandHistory: string[] = [];
let historyIndex: number = -1;
let currentInputBuffer: string = "";

const terminal = new Terminal(
    game,
    (msg, isErr) => {
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.style.color = isErr ? '#ff5555' : '#00ff00';
        line.innerText = msg;

        line.addEventListener('click', () => {
            const copyText = msg.startsWith('> ') ? msg.substring(2) : msg;
            navigator.clipboard.writeText(copyText).then(() => {
                line.classList.add('terminal-copied');
                setTimeout(() => {
                    line.classList.remove('terminal-copied');
                }, 300);
            }).catch(() => {});
        });

        terminalOutputContainer.appendChild(line);
        terminalOutputContainer.scrollTop = terminalOutputContainer.scrollHeight;
    },
    () => {
        terminalOutputContainer.innerHTML = '';
    },
    syncUIFromTerminal
);

terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        if (terminalHintsList.length > 0) {
            terminalActiveHintIndex = (terminalActiveHintIndex + 1) % terminalHintsList.length;
            renderTerminalHints();
        }
    } else if (e.key === ' ' && terminalActiveHintIndex >= 0) {
        e.preventDefault();
        const selection = terminalHintsList[terminalActiveHintIndex].value;
        const val = terminalInput.value;
        if (val.endsWith(' ')) {
            terminalInput.value = val + selection + " ";
        } else {
            const lastSpace = val.lastIndexOf(' ');
            if (lastSpace === -1) {
                terminalInput.value = selection + " ";
            } else {
                terminalInput.value = val.substring(0, lastSpace + 1) + selection + " ";
            }
        }
        updateTerminalHints();
    } else if (e.key === 'Enter') {
        e.stopPropagation();
        const val = terminalInput.value;
        if (val.trim()) {
            const existingIdx = commandHistory.indexOf(val.trim());
            if (existingIdx !== -1) commandHistory.splice(existingIdx, 1);
            commandHistory.unshift(val.trim());

            terminal.execute(val);
            terminalInput.value = '';

            historyIndex = -1;
            currentInputBuffer = "";
            updateTerminalHints();
        }
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (historyIndex === -1) {
            currentInputBuffer = terminalInput.value;
        }
        if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
            historyIndex++;
            terminalInput.value = commandHistory[historyIndex];
        }
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (historyIndex > 0) {
            historyIndex--;
            terminalInput.value = commandHistory[historyIndex];
        } else if (historyIndex === 0) {
            historyIndex = -1;
            terminalInput.value = currentInputBuffer;
        }
    }
});

const toggleTerminal = () => {
    const isVis = terminalBar.style.display === 'flex';
    terminalBar.style.display = isVis ? 'none' : 'flex';
    if (!isVis) {
        terminalOutputContainer.style.display = 'block';
        terminalInput.focus();
        updateTerminalHints();
    } else {
        terminal.cancelPendingReset();
        terminalOutputContainer.style.display = 'none';
        terminalHintsContainer.style.display = 'none';
        terminalInput.blur();
    }
};
btnTerminal.addEventListener('click', toggleTerminal);

setGlobalVolume(currentVolume, false);

window.addEventListener('keydown', (e) => {
    // While focused inside any input, only Escape is hijacked (to blur / close
    // the terminal). Enter is left to the native input behaviour.
    if (document.activeElement?.tagName === 'INPUT') {
        if (e.key === 'Escape') {
            if (terminalBar.style.display === 'flex') {
                toggleTerminal();
            } else {
                (document.activeElement as HTMLElement).blur();
            }
            e.preventDefault();
        }
        return;
    }

    if (e.key === 'f') {
        toggleFullscreen();
    } else if (e.key === 'g') {
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
        if (advancedWindow.classList.contains('visible')) {
            advancedWindow.classList.remove('visible');
        } else {
            settingsWindow.classList.remove('visible');
            advancedWindow.classList.add('visible');
        }
    } else if (e.key === 'm') {
        btnSound.click();
    } else if (e.key === 't' || e.key === 'Enter') {
        // Don't steal Enter when a window with its own buttons is open.
        if (e.key === 'Enter' && (
            settingsWindow.classList.contains('visible') ||
            customGenWindow.classList.contains('visible') ||
            advancedWindow.classList.contains('visible')
        )) {
            return;
        }
        e.preventDefault();
        toggleTerminal();
    } else if (e.key === 'Escape') {
        // Close priority: terminal > windows > pointer lock. Fullscreen exit
        // is left to the browser (we don't preventDefault below).
        if (terminalBar.style.display === 'flex') {
            toggleTerminal();
            e.preventDefault();
            return;
        }

        if (customGenWindow.classList.contains('visible')) {
            btnGenClose.click();
            e.preventDefault();
            return;
        }

        if (advancedWindow.classList.contains('visible')) {
            btnAdvClose.click();
            e.preventDefault();
            return;
        }

        if (settingsWindow.classList.contains('visible')) {
            settingsWindow.classList.remove('visible');
            e.preventDefault();
            return;
        }

        if (document.pointerLockElement) {
            document.exitPointerLock();
            e.preventDefault();
            return;
        }
    }
});

// Mouse-hold-drag speed gesture via pointer lock.
let isDragging = false;
let currentSpeedLog = 0;
const MAX_LOG = 1;  // 10^1 = 10x
const MIN_LOG = -1; // 10^-1 = 0.1x

window.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).id === 'game-canvas') {
        // 200ms hold threshold so plain clicks aren't hijacked.
        const holdTimer = setTimeout(() => {
            isDragging = true;
            canvas.requestPointerLock();

            currentSpeedLog = parseFloat(speedSlider.value);

            gestureContainer.style.display = 'block';
            gestureContainer.style.left = e.clientX + 'px';
            gestureContainer.style.top = (e.clientY - 50) + 'px';
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
        const dx = e.movementX;

        // Low sensitivity gives the gesture a "heavy" feel.
        const sensitivity = 0.005;
        currentSpeedLog += dx * sensitivity;
        currentSpeedLog = Math.max(MIN_LOG, Math.min(MAX_LOG, currentSpeedLog));

        const newSpeed = getSpeedFromSlider(currentSpeedLog);

        updateSpeed(newSpeed);

        gestureSpeedVal.innerText = newSpeed.toFixed(2) + 'x';

        const percent = ((currentSpeedLog - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100;
        gestureBar.style.width = percent + '%';
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

// Scroll-to-adjust-volume works anywhere on the page, except over UI windows
// and terminal output (which have their own scroll behaviour).
window.addEventListener('wheel', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ui-window')) return;
    if (target.closest('#terminal-output-container')) return;

    let baseVol = isMuted ? (lastVolume || 50) : currentVolume;
    let newVol = baseVol;
    if (e.deltaY < 0) {
        newVol = Math.min(100, baseVol + 5);
    } else {
        newVol = Math.max(0, baseVol - 5);
    }
    setGlobalVolume(newVol, false);

    const volContainer = document.getElementById('volume-visual-container');
    const volBar = document.getElementById('volume-visual-bar');

    if (!volContainer && document.body) {
        // Lazy-inject the visual volume bar on first scroll.
        const c = document.createElement('div');
        c.id = 'volume-visual-container';
        const b = document.createElement('div');
        b.id = 'volume-visual-bar';
        c.appendChild(b);
        document.body.appendChild(c);

        c.classList.add('visible');
        b.style.height = currentVolume + '%';

        (window as any).volFadeTimer = setTimeout(() => {
            c.classList.remove('visible');
        }, 1500);
    } else if (volContainer && volBar) {
        volContainer.classList.add('visible');
        volBar.style.height = currentVolume + '%';

        clearTimeout((window as any).volFadeTimer);
        (window as any).volFadeTimer = setTimeout(() => {
            volContainer.classList.remove('visible');
        }, 1500);
    }
});
