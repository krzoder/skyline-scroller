/**
 * Settings panel: button click toggles, outside-click dismisses. The
 * contents inside the panel (sound controls, speed slider, etc) are
 * wired by their respective modules.
 */

import { toggleWindow, dismissOnOutsideClick } from './window-manager';

export interface SettingsWindowDeps {
    btnSettings: HTMLElement;
    settingsWindow: HTMLElement;
}

export function initSettingsWindow(deps: SettingsWindowDeps): void {
    const { btnSettings, settingsWindow } = deps;

    btnSettings.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWindow(settingsWindow);
    });

    dismissOnOutsideClick(settingsWindow, btnSettings);
}
