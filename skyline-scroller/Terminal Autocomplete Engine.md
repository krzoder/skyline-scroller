# Terminal Autocomplete Engine
The autocomplete system (`Terminal.ts:getSuggestions`) provides context-aware command and parameter hints for the game's CLI.

## Matching Algorithm
1. **Trailing Space Detection**: The engine uses regex (`/\s$/`) to determine if the user has completed a token. This dictates whether the last word is treated as a *partial argument* to be completed, or if the system should provide hints for the *next* blank argument.
2. **Root Command Completion**: If the input consists of only one token and no trailing space, it matches the partial string against all registered command names (ignoring aliases to reduce clutter), returning alphabetized hints.
3. **Contextual Argument Delegation**: Once the root command is established, the engine strips it and delegates completion to the command's specific `autocomplete(completedArgs)` function.
4. **Filtering**: The core Terminal engine automatically filters the command's returned suggestions based on the user's current partial argument via a `startsWith(partialArg)` string check. This ensures individual commands don't need to implement their own prefix-matching logic.

## Rich Descriptions
Suggestions conform to the `AutocompleteSuggestion` interface, consisting of a `value` and a `description`. This is used by the UI (rendered dynamically into `#terminal-hints-container` via DOM bindings in `main.ts`) to provide rich visual tooltips alongside the completion text.

See also: [[Terminal Grammar State Machine]], [[UI Architecture Overview]]
