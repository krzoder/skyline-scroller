import './style.css'
import { Game } from './engine/Game'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="ui-layer">
    <div id="seed-display" style="pointer-events: auto;">Seed: <span id="current-seed">Loading...</span></div>
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
const seedDisplay = document.getElementById('seed-display');

if (seedDisplay) {
  seedDisplay.style.cursor = "pointer";
  seedDisplay.title = "Click to Copy";
  seedDisplay.addEventListener('click', () => {
    // Extract just the seed part if it has "Seed: ... | T: ..."
    // The innerText currently is "Seed: [seed] | T: ..." or just "Loading"
    // Let's just copy the whole string or try to be smart.
    // User said: "copy the data from the bar up top - the one that tells seed and time"
    // So copying the whole text is correct.
    navigator.clipboard.writeText(seedDisplay.innerText).then(() => {
      // Visual feedback
      const originalColor = seedDisplay.style.color;
      seedDisplay.style.color = "#4CAF50"; // Green
      setTimeout(() => {
        seedDisplay.style.color = originalColor || "inherit";
      }, 500);
    });
  });
}

setSeedBtn.addEventListener('click', () => {
  if (seedInput.value) {
    game.setSeed(seedInput.value);
    // Keep text: previously cleared
    setSeedBtn.blur();
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
