/**
 * Seed input + Set/Randomize button wiring. Owns the seed UI strip below
 * the canvas. generateRandomSeed here is a legitimate entropy entry point
 * (per CLAUDE.md - "random seed" buttons are sanctioned).
 */

import type { Game } from '../engine/Game';
import { generateRandomSeed } from '../utils/Random';
import { savePersistedState, loadPersistedState } from '../utils/persistence';

export function initSeedControls(game: Game): void {
    const persisted = loadPersistedState();
    const initialSeed = persisted?.lastSeed ?? generateRandomSeed();
    game.setSeed(initialSeed);
    savePersistedState({ lastSeed: initialSeed });

    const seedInput = document.getElementById('seed-input') as HTMLInputElement;
    const setSeedBtn = document.getElementById('set-seed-btn') as HTMLButtonElement;
    const randomSeedBtn = document.getElementById('random-seed-btn') as HTMLButtonElement;

    const applySeed = () => {
        if (seedInput.value) {
            game.setSeed(seedInput.value);
            savePersistedState({ lastSeed: seedInput.value });
            setSeedBtn.blur();
            seedInput.blur();
        }
    };

    setSeedBtn.addEventListener('click', applySeed);
    seedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') applySeed();
    });

    randomSeedBtn.addEventListener('click', () => {
        const s = generateRandomSeed();
        game.setSeed(s);
        savePersistedState({ lastSeed: s });
        randomSeedBtn.blur();
    });
}
