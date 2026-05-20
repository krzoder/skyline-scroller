/**
 * Non-blocking HUD toast for uncaught errors. Replaces a modal alert()
 * that used to spam users on any production exception. The toast lives
 * for 4 s, debounced - repeated errors collapse into one visible message.
 */

const TOAST_TTL_MS = 4000;

type ToastEl = HTMLElement & { _hideTimer?: number };

function showErrorToast(message: string): void {
    let toast = document.getElementById('error-toast') as ToastEl | null;
    if (!toast) {
        toast = document.createElement('div') as ToastEl;
        toast.id = 'error-toast';
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'assertive');
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = window.setTimeout(() => {
        toast?.classList.remove('visible');
    }, TOAST_TTL_MS);
}

export function installGlobalErrorHandlers(): void {
    window.addEventListener('error', (event) => {
        console.error('Runtime error:', event.error ?? event.message, event.filename, event.lineno);
        showErrorToast(`Error: ${event.message}`);
    });
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);
        showErrorToast(`Promise rejected: ${event.reason}`);
    });
}
