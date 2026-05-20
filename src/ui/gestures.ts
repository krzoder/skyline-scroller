/**
 * Canvas mouse/touch gestures and the fullscreen button. Stays out of
 * main.ts so each interaction has an obvious home.
 *
 * Not bundled here (yet): wheel-to-volume - that one mutates the audio
 * module state and will move with the audio extraction.
 */

export function initFullscreenToggle(btn: HTMLElement): void {
    btn.addEventListener('click', toggleFullscreen);
}

export function toggleFullscreen(): void {
    const d = document as Document & {
        webkitFullscreenElement?: Element;
        mozFullScreenElement?: Element;
        msFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
        mozCancelFullScreen?: () => Promise<void>;
        msExitFullscreen?: () => Promise<void>;
    };
    const root = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
        mozRequestFullScreen?: () => Promise<void>;
        msRequestFullscreen?: () => Promise<void>;
    };
    const inFullscreen = d.fullscreenElement || d.webkitFullscreenElement || d.mozFullScreenElement || d.msFullscreenElement;
    if (!inFullscreen) {
        (root.requestFullscreen ?? root.webkitRequestFullscreen ?? root.mozRequestFullScreen ?? root.msRequestFullscreen)?.call(root);
    } else {
        (d.exitFullscreen ?? d.webkitExitFullscreen ?? d.mozCancelFullScreen ?? d.msExitFullscreen)?.call(d);
    }
}

export interface SpeedGestureDeps {
    canvas: HTMLCanvasElement;
    speedSlider: HTMLInputElement;
    gestureContainer: HTMLElement;
    gestureSpeedVal: HTMLElement;
    gestureBar: HTMLElement;
    getSpeedFromSlider: (logVal: number) => number;
    updateSpeed: (newSpeed: number) => void;
}

const MAX_LOG = 1;
const MIN_LOG = -1;
const HOLD_THRESHOLD_MS = 200;
const DRAG_SENSITIVITY = 0.005;

export function initSpeedGestures(deps: SpeedGestureDeps): void {
    const { canvas, speedSlider, gestureContainer, gestureSpeedVal, gestureBar } = deps;

    let isDragging = false;
    let currentSpeedLog = 0;

    window.addEventListener('mousedown', (e) => {
        if ((e.target as HTMLElement).id !== 'game-canvas') return;
        const holdTimer = setTimeout(() => {
            isDragging = true;
            canvas.requestPointerLock();
            currentSpeedLog = parseFloat(speedSlider.value);
            gestureContainer.style.display = 'block';
            gestureContainer.style.left = e.clientX + 'px';
            gestureContainer.style.top = (e.clientY - 50) + 'px';
        }, HOLD_THRESHOLD_MS);
        const cancelHold = () => {
            clearTimeout(holdTimer);
            window.removeEventListener('mouseup', cancelHold);
        };
        window.addEventListener('mouseup', cancelHold);
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging || document.pointerLockElement !== canvas) return;
        currentSpeedLog = Math.max(MIN_LOG, Math.min(MAX_LOG, currentSpeedLog + e.movementX * DRAG_SENSITIVITY));
        const newSpeed = deps.getSpeedFromSlider(currentSpeedLog);
        deps.updateSpeed(newSpeed);
        gestureSpeedVal.innerText = newSpeed.toFixed(2) + 'x';
        const percent = ((currentSpeedLog - MIN_LOG) / (MAX_LOG - MIN_LOG)) * 100;
        gestureBar.style.width = percent + '%';
        gestureBar.style.backgroundColor = `hsl(${percent}, 70%, 50%)`;
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        document.exitPointerLock();
        gestureContainer.style.display = 'none';
    });

    window.addEventListener('dblclick', (e) => {
        if ((e.target as HTMLElement).tagName === 'CANVAS') {
            deps.updateSpeed(1.0);
            speedSlider.value = '0';
        }
    });
}
