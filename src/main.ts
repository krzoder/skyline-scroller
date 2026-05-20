import { installGlobalErrorHandlers } from './ui/error-toast';
import { initSeedControls } from './ui/seed-controls';
import { initFullscreenToggle, initSpeedGestures, toggleFullscreen } from './ui/gestures';
import { initAudioControls } from './ui/audio-controls';
import { toggleWindow } from './ui/window-manager';
import { initSettingsWindow } from './ui/settings-window';
import { installKeyboardShortcuts } from './ui/keyboard-shortcuts';
import { initAdvancedWindow } from './ui/advanced-window';
import { initTerminalBind } from './ui/terminal-bind';
import { initCustomGen } from './ui/custom-gen';
import './style.css'

installGlobalErrorHandlers();

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
             <label style="margin-right: 10px;">Display</label>
             <div id="time-mode-selector" style="display: flex; gap: 5px; flex: 1;">
                 <button class="btn-small" data-val="clock">Clock</button>
                 <button class="btn-small" data-val="score">Ingame Time</button>
             </div>
             <button id="btn-reset-time-mode" class="btn-smart-reset default" title="Reset to Default" style="margin-left: 10px;">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="18" y1="6" x2="6" y2="18"></line>
                 <line x1="6" y1="6" x2="18" y2="18"></line>
               </svg>
             </button>
          </div>
          <div class="row" style="align-items: center; justify-content: space-between; margin-top:8px;">
             <label style="margin-right: 10px;">Clock Format</label>
             <div id="time-fmt-selector" style="display: flex; gap: 5px; flex: 1;">
                 <button class="btn-small" data-val="24h">HH:MM</button>
                 <button class="btn-small" data-val="12h">AM/PM</button>
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

initSeedControls(game);
game.start();

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

const btnTerminal = document.getElementById('btn-terminal')!;
const btnSound = document.getElementById('btn-sound')!;
const soundContainer = document.getElementById('sound-container')!;
const volumePopup = document.getElementById('volume-popup')!;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

const btnSettings = document.getElementById('btn-settings')!;
const settingsWindow = document.getElementById('settings-window')!;
const advancedWindow = document.getElementById('advanced-window')!;
const btnAdvClose = document.getElementById('btn-adv-close')!;

const advanced = initAdvancedWindow({ game, settingsWindow });
const audio = initAudioControls({ game, btnSound, soundContainer, volumePopup, volumeSlider });
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

initSettingsWindow({ btnSettings, settingsWindow });

initFullscreenToggle(btnFullscreen);

const customGen = initCustomGen({
    game,
    settingsWindow,
    customGenWindow,
    btnCustomGen,
    btnGenClose,
    btnGenApply,
    btnGenReset,
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

    advanced.updateUI(true);
};

advanced.onSpeedChange((spd: number) => {
    // The base slider only covers 0.1..10. If the advanced speed is outside
    // that range, snap the base slider to 0 to signal "manual override".
    if (document.activeElement === speedSlider) return;
    if (spd >= 0.1 && spd <= 10) {
        speedSlider.value = getSliderFromSpeed(spd).toString();
    } else {
        speedSlider.value = "0";
    }
});

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


// syncUIFromTerminal is called by the Terminal after a command runs so the
// rest of the UI can mirror any game-state changes that bypassed the
// normal handlers.
const syncUIFromTerminal = () => {
    advanced.updateUI();
    audio.syncFromGame();
    customGen.syncFromGameTreeConfig();
};

const { toggleTerminal } = initTerminalBind({
    game,
    btnTerminal,
    terminalBar,
    terminalInput,
    onSync: syncUIFromTerminal,
});

installKeyboardShortcuts({
    isTerminalOpen: () => terminalBar.style.display === 'flex',
    isCustomGenOpen: () => customGenWindow.classList.contains('visible'),
    isAdvancedOpen: () => advancedWindow.classList.contains('visible'),
    isSettingsOpen: () => settingsWindow.classList.contains('visible'),

    toggleFullscreen,
    toggleCustomGen: () => {
        if (customGen.isOpen()) {
            customGen.cancelResetConfirm();
            customGen.close();
        } else {
            customGen.open();
        }
    },
    randomizeSeed: () => {
        const newSeed = Math.floor(Math.random() * 100000).toString();
        game.setSeed(newSeed);
    },
    toggleSettings: () => { toggleWindow(settingsWindow); },
    toggleAdvanced: () => {
        if (advancedWindow.classList.contains('visible')) {
            advancedWindow.classList.remove('visible');
        } else {
            settingsWindow.classList.remove('visible');
            advancedWindow.classList.add('visible');
        }
    },
    clickMute: () => btnSound.click(),
    toggleTerminal,

    closeCustomGen: () => btnGenClose.click(),
    closeAdvanced: () => btnAdvClose.click(),
    closeSettings: () => settingsWindow.classList.remove('visible'),
});

initSpeedGestures({
    canvas,
    speedSlider,
    gestureContainer,
    gestureSpeedVal,
    gestureBar,
    getSpeedFromSlider,
    updateSpeed,
});

