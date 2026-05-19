# Terminal System Overview

The Terminal subsystem in the Skyline Scroller engine provides a robust, interactive command-line interface bound to the game state. It allows players and developers to modify settings, execute [[Procedural Generation Overview|procedural generation]] adjustments, and interrogate the environment at runtime.

The core logic resides in `src/engine/Terminal.ts`.

## Terminal Grammar State Machine

The terminal command processor operates as a lightweight state machine. When an input string is dispatched via `Terminal.execute(input)`, it undergoes the following lifecycle:

1. **Input Interception**: The terminal first checks if there's an active `pendingResetTarget`. This allows the terminal to pause normal execution and enter a confirmation state, expecting a binary `y` or `yes` response. If intercepted, normal command flow is suspended until the state resolves.
2. **Tokenization**: The input is normalized (`trim()`) and split into an array of positional arguments using regex (`/\s+/`).
3. **Command Resolution**: The first token (the `cmdName`) is popped and resolved against a `Map<string, Command>` registry. The registry maps both canonical names and aliases (e.g., `speed` and `spd`) to the same `Command` implementation.
4. **Execution & Sandboxing**: The `execute(args, ctx)` function is invoked. A `CommandContext` object is injected containing:
   - The primary `Game` instance to interact with the engine.
   - `output` function to write back to the terminal stdout.
   - `clear` function to wipe the console.
   - `onCommandExecuted` callback to trigger generic side effects after execution.

Error catching wraps the execution phase, ensuring that throwing an error inside a command does not crash the main game loop, but instead gracefully reports the issue to `onOutput`.

## Terminal Autocomplete Engine

The autocomplete logic (`getSuggestions(input: string)`) evaluates user input interactively as they type to provide context-aware hints.

- **Global Command Hints**: When the user types the first word, the engine matches the partial string against all registered command names (ignoring aliases for cleaner UI).
- **Command-Specific Autocomplete**: If a valid command token has already been typed and followed by a space, the engine invokes the `Command.autocomplete` method specific to that command.
  - The `autocomplete` delegate receives the array of *already completed* arguments.
  - The engine filters the suggestions returned by the command against the *partially typed* current argument.

This design permits complex grammar hints, such as the `generate` command which provides context-aware key-value pair suggestions like `minHeight:50` and `biomes:forest,plains` dynamically based on the current argument depth.

## Key Built-In Commands

- `help`: Lists all available commands, dynamically parsing descriptions from the registry.
- `speed`: Injects user input into a safe evaluation context using `Function`, mapping `Math` properties to allow mathematical expressions like `speed Math.PI * 2`.
- `generate`: A deep configuration command demonstrating complex autocomplete, allowing manipulation of tree generation on the fly (`generate pine minHeight:100 flowerChance:0.5`).
- `reset`: Showcases the `pendingResetTarget` confirmation state machine, confirming destructive actions like a full factory reset.

For more information on the overarching architecture, see [[Engine_Architecture]].
