/**
 * Advanced Options panel: Display mode + Clock Format selectors, the
 * unbounded-range advanced speed slider (with text input + evalExpression),
 * and a master Reset with two-click confirm.
 *
 * Owns: lastClockFormat, currentAdvSpeedCenter, isAdvResetConfirming.
 * Exposes: updateUI(), onSpeedChange() so the basic speed slider in
 * main.ts can stay in sync.
 */

import type { Game } from '../engine/Game';
import { evalExpression } from '../utils/Expression';

export interface AdvancedWindowDeps {
    game: Game;
    settingsWindow: HTMLElement;
}

export interface AdvancedWindowHandle {
    updateUI: (forceCenter?: boolean) => void;
    onSpeedChange: (cb: (speed: number) => void) => void;
}

function updateResetButton(btn: HTMLElement, isDefault: boolean): void {
    if (isDefault) {
        btn.classList.add('default');
        btn.classList.remove('modified');
        btn.title = 'Default';
    } else {
        btn.classList.add('modified');
        btn.classList.remove('default');
        btn.title = 'Reset to Default';
    }
}

export function initAdvancedWindow(deps: AdvancedWindowDeps): AdvancedWindowHandle {
    const { game, settingsWindow } = deps;

    const btnAdvanced = document.getElementById('btn-advanced')!;
    const advancedWindow = document.getElementById('advanced-window')!;
    const btnAdvClose = document.getElementById('btn-adv-close')!;
    const btnAdvReset = document.getElementById('btn-adv-reset')!;

    const btnResetTimeFmt = document.getElementById('btn-reset-time-fmt')!;
    const timeFmtSelector = document.getElementById('time-fmt-selector')!;
    const timeFmtButtons = timeFmtSelector.querySelectorAll('button');

    const btnResetTimeMode = document.getElementById('btn-reset-time-mode')!;
    const timeModeSelector = document.getElementById('time-mode-selector')!;
    const timeModeButtons = timeModeSelector.querySelectorAll('button');

    const advSpeedSlider = document.getElementById('adv-speed-slider') as HTMLInputElement;
    const advSpeedInput = document.getElementById('adv-speed-input') as HTMLInputElement;
    const btnResetAdvSpeed = document.getElementById('btn-reset-adv-speed')!;

    let lastClockFormat: '24h' | '12h' = '24h';
    let currentAdvSpeedCenter = 1.0;
    let isAdvResetConfirming = false;
    let onSpeedChangeCb: ((spd: number) => void) | null = null;

    function updateTimeFormatUI(): void {
        const current = game.timeFormat || '24h';
        const mode: 'clock' | 'score' = current === 'score' ? 'score' : 'clock';
        const clockFmt: '24h' | '12h' = current === '12h' ? '12h' : (current === '24h' ? '24h' : lastClockFormat);

        timeModeButtons.forEach(btn => btn.classList.toggle('btn-selected', (btn as HTMLElement).dataset.val === mode));
        timeFmtButtons.forEach(btn => btn.classList.toggle('btn-selected', (btn as HTMLElement).dataset.val === clockFmt));

        updateResetButton(btnResetTimeMode, mode === 'clock');
        updateResetButton(btnResetTimeFmt, clockFmt === '24h');
    }

    function speedRange(center: number): { min: number; max: number } {
        if (center === 1.0) return { min: -1.0, max: 20.0 };
        return { min: center - 10, max: center + 10 };
    }

    function getAdvSpeedFromSlider(sliderVal: number, center: number): number {
        const { min, max } = speedRange(center);
        if (min < 0 && max > 1) {
            // Dedicate 0..100 to negatives, 100..500 to 0..1, 500..1000 to >=1.
            if (sliderVal >= 500) return 1 + ((max - 1) * (sliderVal - 500) / 500);
            if (sliderVal >= 100) return (sliderVal - 100) / 400;
            return min + ((0 - min) * sliderVal / 100);
        }
        return min + ((max - min) * sliderVal / 1000);
    }

    function getSliderFromAdvSpeed(speed: number, center: number): number {
        const { min, max } = speedRange(center);
        if (min < 0 && max > 1) {
            if (speed >= 1) return 500 + (500 * (speed - 1) / (max - 1));
            if (speed >= 0) return 100 + (400 * speed);
            return 100 * (speed - min) / (0 - min);
        }
        return 1000 * (speed - min) / (max - min);
    }

    function updateAdvSpeedUI(forceCenter?: boolean): void {
        const spd = game.timeScale;

        if (document.activeElement !== advSpeedSlider) {
            const { min, max } = speedRange(currentAdvSpeedCenter);
            if (forceCenter || spd < min || spd > max) currentAdvSpeedCenter = spd;
            advSpeedSlider.value = Math.round(getSliderFromAdvSpeed(spd, currentAdvSpeedCenter)).toString();
        }

        if (document.activeElement !== advSpeedInput) {
            advSpeedInput.value = Number.isInteger(spd) ? spd.toString() : parseFloat(spd.toFixed(1)).toString();
        }

        updateResetButton(btnResetAdvSpeed, spd === 1.0);
    }

    function executeAdvSpeedSet(val: number, recenter: boolean): void {
        const clamped = Math.max(-10000, Math.min(10000, val));
        if (recenter) currentAdvSpeedCenter = clamped;
        game.setTimeScale(clamped);
        updateAdvSpeedUI(recenter);
        onSpeedChangeCb?.(clamped);
    }

    function applyAdvInputText(valStr: string): void {
        try {
            const val = evalExpression(valStr);
            if (typeof val === 'number' && !isNaN(val)) executeAdvSpeedSet(val, true);
        } catch { /* invalid expression - silently ignored */ }
    }

    function cancelResetConfirm(): void {
        if (!isAdvResetConfirming) return;
        isAdvResetConfirming = false;
        btnAdvReset.innerText = 'Reset Default';
        btnAdvReset.style.background = '#c62828';
    }

    btnAdvanced.addEventListener('click', () => {
        settingsWindow.classList.remove('visible');
        if (advancedWindow.classList.contains('visible')) {
            advancedWindow.classList.remove('visible');
        } else {
            updateTimeFormatUI();
            advancedWindow.classList.add('visible');
            cancelResetConfirm();
        }
    });

    btnAdvClose.addEventListener('click', () => {
        cancelResetConfirm();
        advancedWindow.classList.remove('visible');
    });

    advancedWindow.addEventListener('click', (e) => {
        if (e.target !== btnAdvReset) cancelResetConfirm();
    });

    timeModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = (btn as HTMLElement).dataset.val as 'clock' | 'score';
            game.timeFormat = mode === 'score' ? 'score' : lastClockFormat;
            updateTimeFormatUI();
        });
    });

    timeFmtButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const fmt = (btn as HTMLElement).dataset.val as '24h' | '12h';
            lastClockFormat = fmt;
            game.timeFormat = fmt;
            updateTimeFormatUI();
        });
    });

    btnResetTimeMode.addEventListener('click', () => {
        if (btnResetTimeMode.classList.contains('modified')) {
            game.timeFormat = lastClockFormat;
            updateTimeFormatUI();
        }
    });

    btnResetTimeFmt.addEventListener('click', () => {
        if (btnResetTimeFmt.classList.contains('modified')) {
            lastClockFormat = '24h';
            if (game.timeFormat !== 'score') game.timeFormat = '24h';
            updateTimeFormatUI();
        }
    });

    advSpeedSlider.addEventListener('input', (e) => {
        const sliderVal = parseFloat((e.target as HTMLInputElement).value);
        executeAdvSpeedSet(getAdvSpeedFromSlider(sliderVal, currentAdvSpeedCenter), false);
    });

    advSpeedInput.addEventListener('change', (e) => {
        applyAdvInputText((e.target as HTMLInputElement).value);
    });

    advSpeedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') advSpeedInput.blur();
    });

    btnResetAdvSpeed.addEventListener('click', () => {
        if (btnResetAdvSpeed.classList.contains('modified')) {
            currentAdvSpeedCenter = 1.0;
            executeAdvSpeedSet(1.0, false);
        }
    });

    btnAdvReset.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isAdvResetConfirming) {
            game.timeFormat = '24h';
            updateTimeFormatUI();
            currentAdvSpeedCenter = 1.0;
            executeAdvSpeedSet(1.0, false);
            cancelResetConfirm();
        } else {
            isAdvResetConfirming = true;
            btnAdvReset.innerText = 'Are you sure?';
            btnAdvReset.style.background = '#d32f2f';
            setTimeout(cancelResetConfirm, 3000);
        }
    });

    updateTimeFormatUI();

    return {
        updateUI: updateAdvSpeedUI,
        onSpeedChange: (cb) => { onSpeedChangeCb = cb; },
    };
}
