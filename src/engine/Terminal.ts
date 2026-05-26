import { deepClone } from '../utils/deepClone';
import { evalExpression } from '../utils/Expression';
import type { Game } from './Game';
import type { TreeType } from '../procgen/entities/Tree';
import type { BiomeType } from '../procgen/BiomeSystem';
import { ALL_BIOMES } from '../regions/_index';
import { DEFAULT_TREE_CONFIG } from '../procgen/TreeConfig';

export interface CommandContext {
    game: Game;
    output: (msg: string, isError?: boolean) => void;
    clear: () => void;
    onCommandExecuted?: () => void;
}

export interface AutocompleteSuggestion {
    value: string;
    description: string;
}

export interface Command {
    name: string;
    aliases: string[];
    description: string;
    usage: string;
    execute: (args: string[], ctx: CommandContext) => void;
    autocomplete?: (args: string[]) => AutocompleteSuggestion[];
}

export class Terminal {
    private commands: Map<string, Command> = new Map();
    private game: Game;
    public onOutput: (msg: string, isError?: boolean) => void;
    public onClear: () => void;
    public onCommandExecuted?: () => void;
    public pendingResetTarget: string | null = null;

    constructor(
        game: Game,
        onOutput: (msg: string, isError?: boolean) => void,
        onClear: () => void,
        onCommandExecuted?: () => void
    ) {
        this.game = game;
        this.onOutput = onOutput;
        this.onClear = onClear;
        this.onCommandExecuted = onCommandExecuted;
        this.registerBuiltIns();
    }

    public registerCommand(cmd: Command) {
        this.commands.set(cmd.name.toLowerCase(), cmd);
        for (const alias of cmd.aliases) {
            this.commands.set(alias.toLowerCase(), cmd);
        }
    }

    public execute(input: string) {
        if (!input.trim()) return;

        this.onOutput(`> ${input}`, false);

        if (this.pendingResetTarget) {
            if (input.trim().toLowerCase() === 'y' || input.trim().toLowerCase() === 'yes') {
                this.executeResetConfirm(this.pendingResetTarget);
            } else {
                this.onOutput(`Reset aborted. Executing normally...`);
            }
            this.pendingResetTarget = null;
            if (input.trim().toLowerCase() === 'y' || input.trim().toLowerCase() === 'yes') {
                return;
            }
        }

        const args = input.trim().split(/\s+/);
        const cmdName = args.shift()?.toLowerCase();

        if (!cmdName) return;

        const cmd = this.commands.get(cmdName);
        if (cmd) {
            try {
                cmd.execute(args, {
                    game: this.game,
                    output: this.onOutput,
                    clear: this.onClear,
                    onCommandExecuted: this.onCommandExecuted
                });
                if (this.onCommandExecuted) {
                    this.onCommandExecuted();
                }
            } catch (e: any) {
                this.onOutput(`Error executing command: ${e.message}`, true);
            }
        } else {
            this.onOutput(`Unknown command: '${cmdName}'. Type 'help' for a list of commands.`, true);
        }
    }

    public getSuggestions(input: string): AutocompleteSuggestion[] {
        if (!input.trimStart()) return [];
        const matches = input.match(/\S+/g) || [];
        const endsWithSpace = /\s$/.test(input);

        if (matches.length === 0) return [];

        if (matches.length === 1 && !endsWithSpace) {
            const partial = matches[0].toLowerCase();
            const hints: AutocompleteSuggestion[] = [];
            for (const [name, cmd] of this.commands.entries()) {
                if (name === cmd.name.toLowerCase() && name.startsWith(partial)) {
                    hints.push({ value: name, description: cmd.description });
                }
            }
            return hints.sort((a, b) => a.value.localeCompare(b.value));
        }

        const cmdName = matches[0]?.toLowerCase() || "";
        const cmd = this.commands.get(cmdName);
        if (cmd && cmd.autocomplete) {
            const partialArg = endsWithSpace ? "" : matches[matches.length - 1];
            const completedArgs = endsWithSpace ? matches.slice(1) : matches.slice(1, -1);

            const suggestions = cmd.autocomplete(completedArgs);
            return suggestions.filter(s => s.value.toLowerCase().startsWith(partialArg.toLowerCase())).sort((a, b) => a.value.localeCompare(b.value));
        }
        return [];
    }

    private registerBuiltIns() {
        this.registerCommand({
            name: 'help',
            aliases: ['?', 'h'],
            description: 'Displays all commands or help for a specific command.',
            usage: 'help [command]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: help [command]`, true);
                    return;
                }
                if (args.length === 1) {
                    const c = this.commands.get(args[0].toLowerCase());
                    if (c) {
                        ctx.output(`${c.name} - ${c.description} | Usage: ${c.usage}`);
                        if (c.aliases.length > 0) ctx.output(`Aliases: ${c.aliases.join(', ')}`);
                    } else {
                        ctx.output(`Unknown command: ${args[0]}`, true);
                    }
                } else {
                    ctx.output('Available commands:');
                    const uniqueCmds = new Set(this.commands.values());
                    const sortedCmds = Array.from(uniqueCmds).sort((a, b) => a.name.localeCompare(b.name));
                    for (const c of sortedCmds) {
                        ctx.output(`  ${c.name.padEnd(10)} - ${c.description} | ${c.usage}`);
                    }
                }
            },
            autocomplete: (args) => {
                if (args.length === 0) {
                    const uniqueNames = Array.from(new Set(Array.from(this.commands.entries()).filter(([k, v]) => k === v.name.toLowerCase()).map(([k]) => k)));
                    return uniqueNames.map(k => ({ value: k, description: this.commands.get(k)!.description }));
                }
                return [];
            }
        });

        this.registerCommand({
            name: 'debug-state',
            aliases: ['debug', 'state'],
            description: 'Dumps current game state (seed, cameraX, biome, sky time, etc) for bug reports.',
            usage: 'debug-state',
            execute: (_args, ctx) => {
                const state = ctx.game.getDebugState();
                const json = JSON.stringify(state, null, 2);
                ctx.output(json);
                if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(json).then(
                        () => ctx.output('(copied to clipboard)'),
                        () => { /* clipboard denied, the JSON is still visible above */ }
                    );
                }
            },
        });

        this.registerCommand({
            name: 'seed',
            aliases: ['s'],
            description: 'Sets or displays the current seed.',
            usage: 'seed [value|random]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: seed [value|random]`, true);
                    return;
                }
                if (args.length === 0) {
                    ctx.output(`Current seed: ${ctx.game.getSeed()}`);
                    return;
                }
                let val = args[0];
                if (val.toLowerCase() === 'random') {
                    val = Math.floor(Math.random() * 100000).toString();
                }
                ctx.game.setSeed(val);
                ctx.output(`Seed set to: ${val}`);
            },
            autocomplete: (args) => args.length === 0 ? [{ value: 'random', description: 'Generates a random new seed value.' }] : []
        });

        this.registerCommand({
            name: 'speed',
            aliases: ['spd'],
            description: 'Sets the time scale.',
            usage: 'speed <value>',
            execute: (args, ctx) => {
                if (args.length === 0) {
                    ctx.output(`Current speed: ${ctx.game.timeScale}`);
                    return;
                }
                const inputStr = args.join(' ');

                let val: number;
                try {
                    val = evalExpression(inputStr);
                    if (typeof val !== 'number' || isNaN(val)) throw new Error('Not a valid number');
                } catch {
                    ctx.output(`Invalid speed equation: ${inputStr}`, true);
                    return;
                }

                // Very high limits for fun, but still capped to prevent absolute browser lockup
                const clamped = Math.max(-10000, Math.min(10000, val));
                ctx.game.setTimeScale(clamped);
                ctx.output(`Speed set to ${clamped}`);
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: '0.0', description: 'Pause simulation (0x)' },
                { value: '0.5', description: 'Half speed (0.5x)' },
                { value: '1.0', description: 'Normal speed (1x)' },
                { value: '2.0', description: 'Double speed (2x)' }
            ] : []
        });

        this.registerCommand({
            name: 'pause',
            aliases: ['play', 'resume'],
            description: 'Pauses or resumes the simulation.',
            usage: 'pause [true|false]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: pause [true|false]`, true);
                    return;
                }
                let targetPause = ctx.game.timeScale !== 0; // Toggle by default
                if (args.length === 1) {
                    const val = args[0].toLowerCase();
                    if (val === 'true') targetPause = true;
                    else if (val === 'false') targetPause = false;
                    else {
                        ctx.output(`Invalid parameter '${val}'. Usage: pause [true|false]`, true);
                        return;
                    }
                }
                ctx.game.setTimeScale(targetPause ? 0 : 1.0);
                ctx.output(targetPause ? 'Simulation paused.' : 'Simulation resumed (1.0x).');
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: 'true', description: 'Freeze the simulation' },
                { value: 'false', description: 'Resume the engine' }
            ] : []
        });

        this.registerCommand({
            name: 'volume',
            aliases: ['vol'],
            description: 'Sets the master volume (0 to 100).',
            usage: 'volume <value>',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: volume <value>`, true);
                    return;
                }
                if (args.length === 0) {
                    ctx.output(`Current volume: ${Math.round(ctx.game.getVolume() * 100)}`);
                    return;
                }
                const val = parseFloat(args[0]);
                if (isNaN(val)) {
                    ctx.output(`Invalid volume.`, true);
                    return;
                }
                const vol = Math.max(0, Math.min(100, val));
                ctx.game.setVolume(vol / 100.0);
                ctx.output(`Volume set to ${Math.round(vol)}`);
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: '0', description: 'Mute audio (0%)' },
                { value: '50', description: 'Half volume (50%)' },
                { value: '100', description: 'Maximum volume (100%)' }
            ] : []
        });

        this.registerCommand({
            name: 'mute',
            aliases: [],
            description: 'Toggles audio mute.',
            usage: 'mute [true|false]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: mute [true|false]`, true);
                    return;
                }
                let targetMuted = !ctx.game.getMuted();
                if (args.length === 1) {
                    const val = args[0].toLowerCase();
                    if (val === 'true') targetMuted = true;
                    else if (val === 'false') targetMuted = false;
                    else {
                        ctx.output(`Invalid parameter '${val}'. Usage: mute [true|false]`, true);
                        return;
                    }
                }
                ctx.game.setMuted(targetMuted);
                ctx.output(`Audio muted: ${targetMuted}`);
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: 'true', description: 'Mute audio completely' },
                { value: 'false', description: 'Unmute audio playback' }
            ] : []
        });

        this.registerCommand({
            name: 'format',
            aliases: ['fmt'],
            description: 'Changes time format.',
            usage: 'format <24h|12h|score>',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: format <24h|12h|score>`, true);
                    return;
                }
                if (args.length === 0) {
                    ctx.output(`Current format: ${ctx.game.timeFormat}`);
                    return;
                }
                const fmt = args[0].toLowerCase();
                if (fmt === '24h' || fmt === '12h' || fmt === 'score') {
                    ctx.game.timeFormat = fmt as any;
                    ctx.output(`Time format set to ${fmt}`);
                } else {
                    ctx.output(`Invalid format: ${fmt}`, true);
                }
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: '12h', description: 'AM/PM Clock System' },
                { value: '24h', description: 'HH:MM Clock System' },
                { value: 'score', description: 'In-game numeric time counter' }
            ] : []
        });

        this.registerCommand({
            name: 'fullscreen',
            aliases: ['fs'],
            description: 'Toggles fullscreen mode.',
            usage: 'fullscreen [true|false]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: fullscreen [true|false]`, true);
                    return;
                }
                let targetFS = !document.fullscreenElement;
                if (args.length === 1) {
                    const val = args[0].toLowerCase();
                    if (val === 'true') targetFS = true;
                    else if (val === 'false') targetFS = false;
                    else {
                        ctx.output(`Invalid parameter '${val}'. Usage: fullscreen [true|false]`, true);
                        return;
                    }
                }

                if (targetFS && !document.fullscreenElement) {
                    document.documentElement.requestFullscreen().then(() => {
                        ctx.output('Entered fullscreen mode.');
                    }).catch(err => {
                        ctx.output(`Failed to enter fullscreen: ${err.message}`, true);
                    });
                } else if (!targetFS && document.fullscreenElement) {
                    document.exitFullscreen();
                    ctx.output('Exited fullscreen mode.');
                } else {
                    ctx.output(`Fullscreen is already ${targetFS}.`);
                }
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: 'true', description: 'Enter fullscreen window' },
                { value: 'false', description: 'Exit fullscreen window' }
            ] : []
        });

        this.registerCommand({
            name: 'clear',
            aliases: ['cls', 'c'],
            description: 'Clears terminal output.',
            usage: 'clear',
            execute: (args, ctx) => {
                if (args.length > 0) {
                    ctx.output(`Too many arguments. Usage: clear`, true);
                    return;
                }
                ctx.clear();
            }
        });
        this.registerCommand({
            name: 'reset',
            aliases: [],
            description: 'Resets specific subsystems or the entire game back to defaults.',
            usage: 'reset [speed|volume|format|seed|generate]',
            execute: (args, ctx) => {
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: reset [speed|volume|format|seed|generate]`, true);
                    return;
                }
                if (args.length === 0) {
                    this.pendingResetTarget = 'all';
                    ctx.output(`This resets all settings. Type (y) to confirm.`);
                    return;
                }
                const target = args[0].toLowerCase();

                if (target === 'speed') {
                    ctx.game.setTimeScale(1.0);
                    ctx.output(`Speed reset to default (1.0).`);
                } else if (target === 'volume') {
                    ctx.game.setVolume(0.5);
                    ctx.game.setMuted(false);
                    ctx.output(`Volume and mute reset to default.`);
                } else if (target === 'format') {
                    ctx.game.timeFormat = '24h';
                    ctx.output(`Time format reset to default (HH:MM).`);
                } else if (target === 'seed') {
                    const rnd = Math.floor(Math.random() * 100000).toString();
                    ctx.game.setSeed(rnd);
                    ctx.output(`Seed restarted randomly.`);
                } else if (target === 'generate' || target === 'gen') {
                    const def = deepClone(DEFAULT_TREE_CONFIG);
                    ctx.game.treeConfig = def;
                    if (ctx.game.generator) {
                        ctx.game.generator.config = deepClone(def);
                    }
                    ctx.output(`Generator configuration reset to defaults.`);
                } else {
                    ctx.output(`Unknown reset target: '${target}'. Try 'help reset'.`, true);
                }
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: 'all', description: 'Factory reset all subsystems' },
                { value: 'speed', description: 'Reset speed to defaults (1.0)' },
                { value: 'volume', description: 'Reset volume to defaults (50%)' },
                { value: 'format', description: 'Reset clock to defaults (24h)' },
                { value: 'seed', description: 'Randomizes seed dynamically' },
                { value: 'generate', description: 'Reset tree configuration parameters' }
            ] : []
        });
        this.registerCommand({
            name: 'biome',
            aliases: [],
            description: 'Shows or forces the current generation biome.',
            usage: `biome [${ALL_BIOMES.join('|')}]`,
            execute: (args, ctx) => {
                if (args.length === 0) {
                    ctx.output(`Current biome: ${ctx.game.generator?.getCurrentBiome() || 'unknown'}`);
                    return;
                }
                if (args.length > 1) {
                    ctx.output(`Too many arguments. Usage: biome [${ALL_BIOMES.join('|')}]`, true);
                    return;
                }
                const target = args[0].toLowerCase();
                if (!ALL_BIOMES.includes(target as BiomeType)) {
                    ctx.output(`Unknown biome '${target}'. Valid: ${ALL_BIOMES.join(', ')}`, true);
                    return;
                }
                if (!ctx.game.generator) {
                    ctx.output(`Generator not initialised`, true);
                    return;
                }
                ctx.game.generator.forceBiome(target as BiomeType);
                ctx.output(`Biome forced to: ${target}`);
            },
            autocomplete: (args) => args.length === 0 ? [
                { value: 'forest', description: 'Dense trees, grass and nature' },
                { value: 'desert', description: 'Cacti, dry sand, and heat' },
                { value: 'tundra', description: 'Snow, dead pine trees, and cold' },
                { value: 'plains', description: 'Flat, sparse bushes, easy terrain' },
                { value: 'city', description: 'Buildings block trees out entirely' }
            ] : []
        });

        this.registerCommand({
            name: 'generate',
            aliases: ['gen'],
            description: 'Modifies procedural generation logic parameters.',
            usage: 'generate <type> [key:value]...',
            execute: (args, ctx) => {
                if (args.length > 10) {
                    ctx.output(`Too many arguments. Usage: generate <type> [key:value]...`, true);
                    return;
                }
                if (args.length < 1) {
                    ctx.output('Insufficient arguments. Usage: generate <type> [min] [max] [flower] [biomes]', true);
                    return;
                }
                const type = args[0].toLowerCase() as TreeType;

                const validTypes = ['pine', 'oak', 'sequoia', 'bush', 'cactus', 'hedge'];
                if (!validTypes.includes(type)) {
                    ctx.output(`Invalid generator target: ${type}`, true);
                    return;
                }

                const config = ctx.game.treeConfig[type];
                if (!config) {
                    ctx.output(`Config not found for target: ${type}`, true);
                    return;
                }

                const pairs = args.slice(1);
                if (pairs.length === 0) {
                    ctx.output(`${type} configuration: enabled=${config.enabled}, minHeight=${config.minHeight}, maxHeight=${config.maxHeight}, flowerChance=${config.flowerChance}, biomes=[${config.biomes.join(',')}]`);
                    return;
                }

                let outStr = `${type} updated => `;
                for (const token of pairs) {
                    if (token === 'true') { config.enabled = true; outStr += 'enabled:true '; continue; }
                    if (token === 'false') { config.enabled = false; outStr += 'enabled:false '; continue; }

                    if (token.includes(':')) {
                        const [key, val] = token.split(':');
                        if (key === 'minHeight') { config.minHeight = parseInt(val); outStr += `minHeight:${val} `; }
                        else if (key === 'maxHeight') { config.maxHeight = parseInt(val); outStr += `maxHeight:${val} `; }
                        else if (key === 'flowerChance') { config.flowerChance = parseFloat(val); outStr += `flowerChance:${val} `; }
                        else if (key === 'biomes') { config.biomes = val.split(',') as BiomeType[]; outStr += `biomes:[${val}] `; }
                        else {
                            ctx.output(`Unknown configuration key: ${key}. Ignored.`, true);
                        }
                    } else {
                        ctx.output(`Unknown token: ${token}. Use key:value syntax (e.g. minHeight:50).`, true);
                        return;
                    }
                }

                ctx.output(outStr);

                if (ctx.game.generator) {
                    ctx.game.generator.config = deepClone(ctx.game.treeConfig);
                }
                ctx.game.setSeed(ctx.game.getSeed()); // Forces a re-seed so the new config rebuilds caches.
            },
            autocomplete: (args) => {
                if (args.length === 0) return [
                    { value: 'pine', description: 'Tall, layered triangular tree' },
                    { value: 'oak', description: 'Wide, leafy round tree' },
                    { value: 'sequoia', description: 'Massive, thick trunked tree' },
                    { value: 'bush', description: 'Small round shrub' },
                    { value: 'cactus', description: 'Desert cactus plant' },
                    { value: 'hedge', description: 'Rectangular foliage block' }
                ];
                return [
                    { value: 'true', description: 'Enable globally' },
                    { value: 'false', description: 'Disable globally' },
                    { value: 'minHeight:10', description: 'Set minimum height constraint (small)' },
                    { value: 'minHeight:50', description: 'Set minimum height constraint (medium)' },
                    { value: 'minHeight:100', description: 'Set minimum height constraint (large)' },
                    { value: 'maxHeight:50', description: 'Set maximum height bounds (small limiter)' },
                    { value: 'maxHeight:150', description: 'Set maximum height bounds (medium limiter)' },
                    { value: 'maxHeight:300', description: 'Set maximum height bounds (large limiter)' },
                    { value: 'flowerChance:0.0', description: 'No blooming chance (0%)' },
                    { value: 'flowerChance:0.5', description: 'Half blooming chance (50%)' },
                    { value: 'flowerChance:1.0', description: 'Always blooming (100%)' },
                    { value: 'biomes:forest,plains', description: 'Limit exclusively to standard regions' },
                    { value: 'biomes:desert', description: 'Limit exclusively to desert regions' },
                    { value: 'biomes:tundra', description: 'Limit exclusively to tundra regions' }
                ];
            }
        });
    }

    public cancelPendingReset() {
        this.pendingResetTarget = null;
    }

    private executeResetConfirm(target: string) {
        if (target === 'all') {
            this.game.setTimeScale(1.0);
            this.game.setVolume(0.5);
            this.game.setMuted(false);
            this.game.timeFormat = '24h';
            const rnd = Math.floor(Math.random() * 100000).toString();
            this.game.setSeed(rnd);
            const def = deepClone(DEFAULT_TREE_CONFIG);
            this.game.treeConfig = def;
            if (this.game.generator) {
                this.game.generator.config = deepClone(def);
            }
            this.onOutput(`All settings and configurations factory reset!`);
            if (this.onCommandExecuted) this.onCommandExecuted();
        }
    }
}
