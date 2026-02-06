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
          <label>Time Format</label>
          <select id="adv-time-format" style="width:100%; padding: 8px; margin-top:5px; background:#333; color:white; border:1px solid #555; border-radius:4px;">
            <option value="24h" selected>24h Clock (13:37)</option>
            <option value="12h">12h Clock (1:37 PM)</option>
            <option value="score">Ingame Time (Score)</option>
          </select>
        </div>

        <button id="btn-adv-close" class="control-btn" style="margin-top:auto; background:#444;">Close</button>
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
        <!-- Placeholder Controls -->
        <input type="text" id="custom-seed-input" placeholder="Seed (Text)" style="padding: 8px; background: rgba(0,0,0,0.5); border: 1px solid #555; color: white;">
        
        <button class="btn-small" style="background:#446; text-align:center;">Biome: Auto</button>
        <button class="btn-small" style="background:#446; text-align:center;">Density: Medium</button>
        <button class="btn-small" style="background:#446; text-align:center;">Terrain: Hilly</button>
        <button class="btn-small" style="background:#446; text-align:center;">Weather: Clear</button>
      </div>

      <div id="gen-preview-container">
         <canvas id="gen-preview-canvas"></canvas>
         <div style="position: absolute; bottom: 10px; right: 10px;">
            <button id="btn-gen-preview" class="btn-small" style="background: rgba(0,0,0,0.7);">Update Preview</button>
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
const iconSound = document.getElementById('icon-sound')!;
const soundContainer = document.getElementById('sound-container')!;
const volumePopup = document.getElementById('volume-popup')!;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;

const btnSettings = document.getElementById('btn-settings')!;
const settingsWindow = document.getElementById('settings-window')!;
const btnAdvanced = document.getElementById('btn-advanced')!;
const advancedWindow = document.getElementById('advanced-window')!;
const btnAdvClose = document.getElementById('btn-adv-close')!;
const advTimeFormat = document.getElementById('adv-time-format') as HTMLSelectElement;

// Advanced Options Logic
btnAdvanced.addEventListener('click', () => {
  // Close settings, open Advanced
  settingsWindow.classList.remove('visible');
  const isVis = advancedWindow.classList.contains('visible');
  if (isVis) advancedWindow.classList.remove('visible');
  else advancedWindow.classList.add('visible');
});

btnAdvClose.addEventListener('click', () => {
  advancedWindow.classList.remove('visible');
});

advTimeFormat.addEventListener('change', () => {
  const val = advTimeFormat.value as 'score' | '24h' | '12h';
  game.timeFormat = val;
});
const btnFullscreen = document.getElementById('btn-fullscreen')!;
const btnCustomGen = document.getElementById('btn-custom-gen')!;
// btnAdvanced already declared above
const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;

const customGenWindow = document.getElementById('custom-gen-window')!;
const btnGenClose = document.getElementById('btn-gen-close')!;
const btnGenApply = document.getElementById('btn-gen-apply')!;
const btnGenPreview = document.getElementById('btn-gen-preview')!;
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
  // Check if open, if so close
  if (customGenWindow.classList.contains('visible')) {
    customGenWindow.classList.remove('visible');
    return;
  }

  settingsWindow.classList.remove('visible');
  customGenWindow.classList.add('visible');

  // Init preview game if needed
  if (!previewGame) {
    previewGame = new Game(previewCanvas, true); // isPreview = true
    // Force size match (css is handled but canvas buffer needs logic)
    // Game.resize() handles it usually if called
    previewGame.resize();
  }
  previewGame.start();
};
btnCustomGen.addEventListener('click', openCustomGen);
btnGenClose.addEventListener('click', () => customGenWindow.classList.remove('visible'));

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
    game.setSeed(randomSeed);
    if (previewGame) previewGame.setSeed(randomSeed);

    // Reset Logic - Maybe reset other params too in future
    cancelResetConfirm();
    // customGenWindow.classList.remove('visible'); // Updated: Don't close on reset
  } else {
    // First click
    isResetConfirming = true;
    btnGenReset.innerText = "Confirm Reset?";
    btnGenReset.style.background = "#8b0000"; // Darker Red
  }
});

// Cancel reset confirm if clicking apply or close or ANY control in window
const genControls = document.getElementById('gen-controls')!;
genControls.addEventListener('click', () => cancelResetConfirm());

btnGenApply.addEventListener('click', () => {
  cancelResetConfirm();
  const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;
  if (seed) game.setSeed(seed);
});
btnGenClose.addEventListener('click', () => {
  cancelResetConfirm();
  customGenWindow.classList.remove('visible');
});

// Seed input Enter support
const customSeedInput = document.getElementById('custom-seed-input') as HTMLInputElement;
customSeedInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    btnGenPreview.click();
  }
});

btnGenPreview.addEventListener('click', () => {
  cancelResetConfirm(); // Clear reset on preview update
  const seed = (document.getElementById('custom-seed-input') as HTMLInputElement).value;
  if (previewGame) {
    if (seed) previewGame.setSeed(seed);
    else previewGame.setSeed(Math.random().toString());
  }
});

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
let volume = 1.0;
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

// Shortcuts
const seedInputEl = document.getElementById('seed-input');
const customSeedInputEl = document.getElementById('custom-seed-input');

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
  if ((e.target as HTMLElement).tagName === 'CANVAS') {
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
});