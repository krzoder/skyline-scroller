# Terminal Grammar State Machine
The Terminal (`src/engine/Terminal.ts`) implements a custom command-line interface for the game.

## Parsing Strategy
The terminal intercepts string input and processes it through a sequential state machine:
1. **Pending Confirmation Interception**: If the terminal is in a confirmation state (e.g., `pendingResetTarget` is populated), it intercepts the raw input to check for `y` or `yes`. If not confirmed, it aborts the pending action. This enables 2-step confirmations for destructive actions.
2. **Tokenization**: Input is split by whitespace into an array of arguments (`args = input.trim().split(/\s+/)`).
3. **Command Resolution**: The first token is shifted, normalized to lowercase, and matched against a `Map<string, Command>` that stores both primary command names and aliases.
4. **Execution Dispatch**: If a match is found, the command's `execute(args, ctx)` method is invoked, passing a `CommandContext` object containing the active `Game` instance, an `output` callback, and UI state hooks.

## Available Commands
- `help` (`?`, `h`): Displays command list and usage.
- `seed` (`s`): Sets or shows the map seed.
- `speed` (`spd`): Evals mathematical expressions (via safe-ish `Function` injection of `Math` variables like `π`) to set the engine time scale.
- `pause` (`play`, `resume`): Toggles or explicitly sets engine pause state.
- `volume` (`vol`), `mute`: Audio state control.
- `format` (`fmt`): Alters time display (12h/24h/score).
- `fullscreen` (`fs`): DOM fullscreen API wrapper.
- `clear` (`cls`, `c`): Clears output buffer.
- `reset`: Triggers the 2-step confirmation prompt to factory-reset specific subsystems (speed, volume, format, seed, generate, or all).
- `biome`: Inspects or forces generation biome.
- `generate` (`gen`): Complex sub-grammar using `key:value` syntax (e.g., `generate pine minHeight:50`) to mutate procedural generation configs dynamically.

See also: [[Terminal Autocomplete Engine]]
