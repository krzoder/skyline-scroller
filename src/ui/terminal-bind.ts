/**
 * Terminal UI: command history (Up/Down), tab-complete (Tab to cycle
 * hints + Space to insert), hint dropdown rendering, output line
 * appending, and the open/close toggle.
 */

import type { Game } from '../engine/Game';
import { Terminal, type AutocompleteSuggestion } from '../engine/Terminal';

export interface TerminalBindDeps {
    game: Game;
    btnTerminal: HTMLElement;
    terminalBar: HTMLElement;
    terminalInput: HTMLInputElement;
    /** Called after each terminal command so the rest of the UI can re-sync. */
    onSync: () => void;
}

export interface TerminalBindHandle {
    toggleTerminal: () => void;
    isOpen: () => boolean;
}

export function initTerminalBind(deps: TerminalBindDeps): TerminalBindHandle {
    const { game, btnTerminal, terminalBar, terminalInput, onSync } = deps;

    const terminalOutputContainer = document.getElementById('terminal-output-container')!;
    const terminalHintsContainer = document.getElementById('terminal-hints-container')!;

    let terminalHintsList: AutocompleteSuggestion[] = [];
    let terminalActiveHintIndex = -1;

    const commandHistory: string[] = [];
    let historyIndex = -1;
    let currentInputBuffer = '';

    function renderHints(): void {
        if (terminalHintsList.length === 0) {
            terminalHintsContainer.style.display = 'none';
            terminalHintsContainer.innerHTML = '';
            return;
        }
        terminalHintsContainer.style.display = 'flex';
        terminalHintsContainer.style.alignItems = 'center';
        terminalHintsContainer.innerHTML = '';

        terminalHintsList.forEach((hint, idx) => {
            const el = document.createElement('div');
            el.style.borderRadius = '4px';
            el.style.transition = 'all 0.1s ease-in-out';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            if (idx === terminalActiveHintIndex) {
                el.innerHTML = `
                    <span style="font-weight:bold; font-size:1.05em; color:#fff;">${hint.value}</span>
                    <span style="color:rgba(255,255,255,0.4); margin:0 6px;">|</span>
                    <span style="font-size:0.9em; color:#00E676;">${hint.description}</span>
                `;
                el.style.background = 'rgba(0, 200, 80, 0.15)';
                el.style.color = '#fff';
                el.style.boxShadow = '0 2px 6px rgba(0, 200, 80, 0.2)';
                el.style.border = '1px solid rgba(0, 200, 80, 0.4)';
                el.style.padding = '4px 10px';
                el.style.zIndex = '10';
                el.style.whiteSpace = 'nowrap';
            } else {
                el.innerText = hint.value;
                el.style.background = 'rgba(255, 255, 255, 0.1)';
                el.style.color = '#eee';
                el.style.padding = '4px 8px';
                el.style.border = '1px solid transparent';
            }
            terminalHintsContainer.appendChild(el);
        });
    }

    function updateHints(): void {
        terminalHintsList = terminal.getSuggestions(terminalInput.value);
        terminalActiveHintIndex = -1;
        renderHints();
    }

    const terminal = new Terminal(
        game,
        (msg, isErr) => {
            const line = document.createElement('div');
            line.className = 'terminal-line';
            line.style.color = isErr ? '#ff5555' : '#00ff00';
            line.innerText = msg;
            line.addEventListener('click', () => {
                const copyText = msg.startsWith('> ') ? msg.substring(2) : msg;
                navigator.clipboard.writeText(copyText).then(() => {
                    line.classList.add('terminal-copied');
                    setTimeout(() => line.classList.remove('terminal-copied'), 300);
                }).catch(() => { /* clipboard denied */ });
            });
            terminalOutputContainer.appendChild(line);
            terminalOutputContainer.scrollTop = terminalOutputContainer.scrollHeight;
        },
        () => { terminalOutputContainer.innerHTML = ''; },
        onSync,
    );

    function insertHintSelection(): void {
        if (terminalActiveHintIndex < 0) return;
        const selection = terminalHintsList[terminalActiveHintIndex].value;
        const val = terminalInput.value;
        if (val.endsWith(' ')) {
            terminalInput.value = val + selection + ' ';
        } else {
            const lastSpace = val.lastIndexOf(' ');
            terminalInput.value = lastSpace === -1
                ? selection + ' '
                : val.substring(0, lastSpace + 1) + selection + ' ';
        }
    }

    terminalInput.addEventListener('input', updateHints);

    terminalInput.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            if (terminalHintsList.length > 0) {
                terminalActiveHintIndex = (terminalActiveHintIndex + 1) % terminalHintsList.length;
                renderHints();
            }
        } else if (e.key === ' ' && terminalActiveHintIndex >= 0) {
            e.preventDefault();
            insertHintSelection();
            updateHints();
        } else if (e.key === 'Enter') {
            e.stopPropagation();
            const val = terminalInput.value;
            if (!val.trim()) return;
            const existingIdx = commandHistory.indexOf(val.trim());
            if (existingIdx !== -1) commandHistory.splice(existingIdx, 1);
            commandHistory.unshift(val.trim());

            terminal.execute(val);
            terminalInput.value = '';
            historyIndex = -1;
            currentInputBuffer = '';
            updateHints();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            if (historyIndex === -1) currentInputBuffer = terminalInput.value;
            if (commandHistory.length > 0 && historyIndex < commandHistory.length - 1) {
                historyIndex++;
                terminalInput.value = commandHistory[historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            if (historyIndex > 0) {
                historyIndex--;
                terminalInput.value = commandHistory[historyIndex];
            } else if (historyIndex === 0) {
                historyIndex = -1;
                terminalInput.value = currentInputBuffer;
            }
        }
    });

    function isOpen(): boolean {
        return terminalBar.style.display === 'flex';
    }

    function toggleTerminal(): void {
        const wasOpen = isOpen();
        terminalBar.style.display = wasOpen ? 'none' : 'flex';
        if (!wasOpen) {
            terminalOutputContainer.style.display = 'block';
            terminalInput.focus();
            updateHints();
        } else {
            terminal.cancelPendingReset();
            terminalOutputContainer.style.display = 'none';
            terminalHintsContainer.style.display = 'none';
            terminalInput.blur();
        }
    }

    btnTerminal.addEventListener('click', toggleTerminal);

    return { toggleTerminal, isOpen };
}
