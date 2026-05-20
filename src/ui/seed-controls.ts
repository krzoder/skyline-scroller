/**
 * Seed input + Set/Randomize button wiring. Owns the seed UI strip below
 * the canvas. Math.random() here is a legitimate entropy entry point
 * (per CLAUDE.md - "random seed" buttons are sanctioned).
 */

import type { Game } from '../engine/Game';

function randomSeed(): string {
    return Math.floor(Math.random() * 100000).toString();
}

export function initSeedControls(game: Game): void {
    game.setSeed(randomSeed());

    const seedInput = document.getElementById('seed-input') as HTMLInputElement;
    const setSeedBtn = document.getElementById('set-seed-btn') as HTMLButtonElement;
    const randomSeedBtn = document.getElementById('random-seed-btn') as HTMLButtonElement;

    const applySeed = () => {
        if (seedInput.value) {
            game.setSeed(seedInput.value);
            setSeedBtn.blur();
            seedInput.blur();
        }
    };

    setSeedBtn.addEventListener('click', applySeed);
    seedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applySeed();
    });

    randomSeedBtn.addEventListener('click', () => {
        game.setSeed(randomSeed());
        randomSeedBtn.blur();
    });
}
