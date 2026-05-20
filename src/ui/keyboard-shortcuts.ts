/**
 * Window-level keyboard shortcuts. Single keydown listener routes to
 * caller-provided callbacks. Adding a binding = add a row + a callback;
 * order matters only inside the Escape priority chain (terminal beats
 * windows beats pointer lock).
 */

export interface KeyboardShortcutsDeps {
    /** Single-key actions. Return true to mark handled (prevents default). */
    isTerminalOpen: () => boolean;
    isCustomGenOpen: () => boolean;
    isAdvancedOpen: () => boolean;
    isSettingsOpen: () => boolean;

    toggleFullscreen: () => void;
    toggleCustomGen: () => void;       // 'g' - open if closed, close (with confirm-cancel) if open
    randomizeSeed: () => void;
    toggleSettings: () => void;
    toggleAdvanced: () => void;
    clickMute: () => void;
    toggleTerminal: () => void;

    closeCustomGen: () => void;   // Escape route
    closeAdvanced: () => void;    // Escape route
    closeSettings: () => void;    // Escape route
}

export function installKeyboardShortcuts(deps: KeyboardShortcutsDeps): void {
    window.addEventListener('keydown', (e) => {
        // While focused inside an input, only Escape is hijacked (blur or
        // close terminal); Enter is left to native input behaviour.
        if (document.activeElement?.tagName === 'INPUT') {
            if (e.key === 'Escape') {
                if (deps.isTerminalOpen()) {
                    deps.toggleTerminal();
                } else {
                    (document.activeElement as HTMLElement).blur();
                }
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'f': deps.toggleFullscreen(); return;
            case 'g': deps.toggleCustomGen(); return;
            case 'r': deps.randomizeSeed(); return;
            case 's': deps.toggleSettings(); return;
            case 'a': deps.toggleAdvanced(); return;
            case 'm': deps.clickMute(); return;
            case 't':
            case 'Enter': {
                // Don't steal Enter when a window with its own buttons is open.
                if (e.key === 'Enter' && (deps.isSettingsOpen() || deps.isCustomGenOpen() || deps.isAdvancedOpen())) {
                    return;
                }
                e.preventDefault();
                deps.toggleTerminal();
                return;
            }
            case 'Escape': {
                // Priority: terminal > custom-gen > advanced > settings > pointer lock.
                if (deps.isTerminalOpen()) { deps.toggleTerminal(); e.preventDefault(); return; }
                if (deps.isCustomGenOpen()) { deps.closeCustomGen(); e.preventDefault(); return; }
                if (deps.isAdvancedOpen()) { deps.closeAdvanced(); e.preventDefault(); return; }
                if (deps.isSettingsOpen()) { deps.closeSettings(); e.preventDefault(); return; }
                if (document.pointerLockElement) { document.exitPointerLock(); e.preventDefault(); return; }
                return;
            }
        }
    });
}
