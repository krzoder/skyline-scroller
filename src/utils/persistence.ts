/**
 * User-preference persistence. Schema-versioned so future shape changes
 * can ignore old payloads cleanly. localStorage is best-effort; failures
 * (disabled storage, quota exceeded) are silent.
 */

import type { TreeConfig } from '../procgen/TreeConfig';

const KEY = 'skyline-scroller:state:v1';
const VERSION = 1;

export interface PersistedState {
    schemaVersion: number;
    volume?: number;
    isMuted?: boolean;
    timeFormat?: 'score' | '24h' | '12h';
    lastSeed?: string;
    treeConfig?: TreeConfig;
}

export function loadPersistedState(): PersistedState | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        if (obj?.schemaVersion !== VERSION) return null;
        return obj as PersistedState;
    } catch {
        return null;
    }
}

export function savePersistedState(patch: Partial<PersistedState>): void {
    try {
        const current = loadPersistedState() ?? { schemaVersion: VERSION };
        const merged = { ...current, ...patch, schemaVersion: VERSION };
        localStorage.setItem(KEY, JSON.stringify(merged));
    } catch {
        // silent: storage disabled, quota exceeded, etc.
    }
}
