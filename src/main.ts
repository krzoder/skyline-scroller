import './style.css'
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
    <div id="controls" style="margin-top: 10px; pointer-events: auto;">
      <input type="text" id="seed-input" placeholder="Enter seed..." style="padding: 5px; border-radius: 4px; border: none;">
      <button id="set-seed-btn" style="padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; background: #eee; color: #333;">Set Seed</button>
      <button id="random-seed-btn" style="padding: 5px 10px; border-radius: 4px; border: none; cursor: pointer; background: #eee; color: #333;">Randomize</button>
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
    navigator.clipboard.writeText(textFn()).then(() => {
      const originalColor = element.style.color;
      element.style.color = "#4CAF50"; // Green
      setTimeout(() => {
        element.style.color = originalColor || "inherit";
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

// Pause on space?
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    // Toggle pause if implemented
  }
});
