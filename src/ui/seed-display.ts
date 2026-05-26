/**
 * HUD seed + time display. Subscribes to Game.onTick and mutates the
 * two readouts only when the rendered text actually changes. Moved out of
 * Game.update so the engine stops reaching into UI DOM (DEC-11 Stage A).
 */

import type { Game, GameStateSnapshot } from '../engine/Game';

export interface SeedDisplayDeps {
    game: Game;
    uiSeedVal: HTMLElement;
    uiTimeVal: HTMLElement;
}

export interface SeedDisplayHandle {
    dispose: () => void;
}

function formatTime(snap: Readonly<GameStateSnapshot>): string {
    if (snap.timeFormat === 'score') return Math.floor(snap.cameraX).toString();
    if (snap.skyTime === null) return '';
    const t = snap.skyTime;
    const h = Math.floor(t);
    const m = Math.floor((t - h) * 60);
    const mStr = m.toString().padStart(2, '0');
    if (snap.timeFormat === '12h') {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${mStr} ${ampm}`;
    }
    return `${h.toString().padStart(2, '0')}:${mStr}`;
}

export function initSeedDisplay(deps: SeedDisplayDeps): SeedDisplayHandle {
    const { game, uiSeedVal, uiTimeVal } = deps;

    let lastSeed = '';
    let lastTimeText = '';

    const unsub = game.onTick((snap) => {
        if (snap.seed !== lastSeed) {
            uiSeedVal.innerText = snap.seed;
            lastSeed = snap.seed;
        }
        const timeText = formatTime(snap);
        if (timeText !== lastTimeText) {
            uiTimeVal.innerText = timeText;
            lastTimeText = timeText;
        }
    });

    return { dispose: unsub };
}
