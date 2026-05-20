/**
 * Generic open/close helpers for the modal panels (settings, advanced,
 * custom-gen). The "visible" class is the only state - CSS handles the
 * actual fade/slide.
 */

export function toggleWindow(el: HTMLElement): boolean {
    const isVisible = el.classList.contains('visible');
    el.classList.toggle('visible', !isVisible);
    return !isVisible;
}

export function openWindow(el: HTMLElement): void {
    el.classList.add('visible');
}

export function closeWindow(el: HTMLElement): void {
    el.classList.remove('visible');
}

/**
 * Dismiss `target` when the user clicks anywhere except inside `target`
 * or its `trigger` button. Each call installs one listener; safe to use
 * from init code that runs once.
 */
export function dismissOnOutsideClick(target: HTMLElement, trigger: HTMLElement): void {
    window.addEventListener('click', (e) => {
        if (!target.classList.contains('visible')) return;
        const node = e.target as Node;
        if (!target.contains(node) && !trigger.contains(node)) {
            closeWindow(target);
        }
    });
}
