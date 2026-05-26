/**
 * Mute button, volume slider/popup, wheel-to-adjust, and the lazy
 * volume-visual bubble that appears when scrolling. Owns the audio UI
 * state (currentVolume, lastVolume, isMuted) so main.ts does not.
 */

import type { Game } from '../engine/Game';
import { clamp } from '../utils/math';

export interface AudioControlsDeps {
    game: Game;
    btnSound: HTMLElement;
    soundContainer: HTMLElement;
    volumePopup: HTMLElement;
    volumeSlider: HTMLInputElement;
}

const VOL_VISUAL_FADE_MS = 1500;
const VOL_WHEEL_STEP = 5;
const DEFAULT_VOLUME = 50;

const SVG_MUTED = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>`;
const SVG_UNMUTED = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;

export interface AudioControls {
    /** Reconcile the UI with whatever Game thinks the volume/mute state is now. Used after Terminal commands. */
    syncFromGame: () => void;
}

export function initAudioControls(deps: AudioControlsDeps): AudioControls {
    const { game, btnSound, soundContainer, volumePopup, volumeSlider } = deps;

    let currentVolume = DEFAULT_VOLUME;
    let lastVolume = DEFAULT_VOLUME;
    let isMuted = false;
    let volFadeTimer: number | null = null;

    function applyState(): void {
        volumeSlider.value = currentVolume.toString();
        game.setVolume(currentVolume / 100);
        game.setMuted(isMuted);
        const icon = document.getElementById('icon-sound');
        if (icon) icon.innerHTML = isMuted ? SVG_MUTED : SVG_UNMUTED;
    }

    function setGlobalVolume(val: number, fromMuteToggle = false): void {
        if (fromMuteToggle) {
            if (isMuted) {
                isMuted = false;
                currentVolume = lastVolume || DEFAULT_VOLUME;
            } else {
                isMuted = true;
                if (currentVolume > 0) lastVolume = currentVolume;
                currentVolume = 0;
            }
        } else if (val > 0) {
            currentVolume = val;
            lastVolume = val;
            isMuted = false;
        } else {
            currentVolume = 0;
            isMuted = true;
        }
        applyState();
    }

    btnSound.addEventListener('click', () => setGlobalVolume(0, true));
    soundContainer.addEventListener('mouseenter', () => { volumePopup.style.display = 'block'; });
    soundContainer.addEventListener('mouseleave', () => { volumePopup.style.display = 'none'; });
    volumeSlider.addEventListener('input', (e) => {
        setGlobalVolume(parseFloat((e.target as HTMLInputElement).value), false);
    });

    // Wheel anywhere on the page (except UI windows + terminal output)
    // nudges volume. The visual bubble is lazy-injected on first scroll.
    window.addEventListener('wheel', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.ui-window')) return;
        if (target.closest('#terminal-output-container')) return;

        const base = isMuted ? (lastVolume || DEFAULT_VOLUME) : currentVolume;
        const delta = e.deltaY < 0 ? VOL_WHEEL_STEP : -VOL_WHEEL_STEP;
        setGlobalVolume(clamp(base + delta, 0, 100), false);
        showVolumeBubble();
    });

    function showVolumeBubble(): void {
        let container = document.getElementById('volume-visual-container');
        let bar = document.getElementById('volume-visual-bar');

        if (!container) {
            container = document.createElement('div');
            container.id = 'volume-visual-container';
            bar = document.createElement('div');
            bar.id = 'volume-visual-bar';
            container.appendChild(bar);
            document.body.appendChild(container);
        }
        container.classList.add('visible');
        if (bar) bar.style.height = currentVolume + '%';

        if (volFadeTimer !== null) clearTimeout(volFadeTimer);
        volFadeTimer = window.setTimeout(() => {
            container?.classList.remove('visible');
        }, VOL_VISUAL_FADE_MS);
    }

    applyState();

    return {
        syncFromGame() {
            const gVol = Math.round(game.getVolume() * 100);
            if (currentVolume !== gVol) setGlobalVolume(gVol, false);
            const gMuted = game.getMuted();
            if (isMuted !== gMuted) setGlobalVolume(0, true);
        },
    };
}
