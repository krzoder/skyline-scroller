/**
 * Tiny recursive-descent parser for arithmetic expressions.
 *
 * Grammar:
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/') factor)*
 *   factor := ('+' | '-') factor | atom
 *   atom   := number | constant | '(' expr ')'
 *   constant := 'π' | 'pi' | 'e'
 *
 * No identifiers, no function calls, no member access. Replaces the
 * `new Function(...)` eval that previously powered the `speed` terminal
 * command - eliminates the arbitrary-code-execution surface
 * `(()=>{while(1);})()` could exploit.
 */

export class ExpressionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExpressionError';
    }
}

type Token =
    | { type: 'num'; value: number }
    | { type: 'op'; value: '+' | '-' | '*' | '/' }
    | { type: 'lparen' }
    | { type: 'rparen' };

function isIdentChar(c: string | undefined): boolean {
    if (!c) return false;
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';
}

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const s = input;

    while (i < s.length) {
        const c = s[i];

        if (c === ' ' || c === '\t' || c === '\n') { i++; continue; }

        if (c === '+' || c === '-' || c === '*' || c === '/') {
            tokens.push({ type: 'op', value: c });
            i++;
            continue;
        }

        if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
        if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }

        if (c >= '0' && c <= '9' || c === '.') {
            let j = i;
            while (j < s.length && (s[j] >= '0' && s[j] <= '9' || s[j] === '.')) j++;
            if (j < s.length && (s[j] === 'e' || s[j] === 'E')) {
                j++;
                if (j < s.length && (s[j] === '+' || s[j] === '-')) j++;
                while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
            }
            const value = Number(s.slice(i, j));
            if (Number.isNaN(value)) throw new ExpressionError(`Bad number at position ${i}`);
            tokens.push({ type: 'num', value });
            i = j;
            continue;
        }

        if (c === 'π') { tokens.push({ type: 'num', value: Math.PI }); i++; continue; }
        if (s.startsWith('pi', i) && !isIdentChar(s[i + 2])) {
            tokens.push({ type: 'num', value: Math.PI });
            i += 2;
            continue;
        }
        if (c === 'e' && !isIdentChar(s[i + 1])) {
            tokens.push({ type: 'num', value: Math.E });
            i++;
            continue;
        }

        throw new ExpressionError(`Unexpected character '${c}' at position ${i}`);
    }

    return tokens;
}

function parse(tokens: Token[]): number {
    let pos = 0;

    const peekOp = (op: '+' | '-' | '*' | '/'): boolean => {
        const t = tokens[pos];
        return !!t && t.type === 'op' && t.value === op;
    };

    const parseAtom = (): number => {
        const t = tokens[pos];
        if (!t) throw new ExpressionError('Unexpected end of expression');
        if (t.type === 'num') { pos++; return t.value; }
        if (t.type === 'lparen') {
            pos++;
            const value = parseExpr();
            const close = tokens[pos];
            if (!close || close.type !== 'rparen') throw new ExpressionError('Missing closing parenthesis');
            pos++;
            return value;
        }
        throw new ExpressionError(`Unexpected token at position ${pos}`);
    };

    const parseFactor = (): number => {
        if (peekOp('+')) { pos++; return parseFactor(); }
        if (peekOp('-')) { pos++; return -parseFactor(); }
        return parseAtom();
    };

    const parseTerm = (): number => {
        let value = parseFactor();
        while (peekOp('*') || peekOp('/')) {
            const op = tokens[pos++] as { type: 'op'; value: '*' | '/' };
            if (op.value === '*') value *= parseFactor();
            else value /= parseFactor();
        }
        return value;
    };

    const parseExpr = (): number => {
        let value = parseTerm();
        while (peekOp('+') || peekOp('-')) {
            const op = tokens[pos++] as { type: 'op'; value: '+' | '-' };
            const rhs = parseTerm();
            value = op.value === '+' ? value + rhs : value - rhs;
        }
        return value;
    };

    const value = parseExpr();
    if (pos < tokens.length) {
        throw new ExpressionError(`Unexpected token after expression (position ${pos})`);
    }
    return value;
}

/**
 * Evaluate a math expression containing only +, -, *, /, parens, unary +/-,
 * numeric literals (including 1e3-style exponents), and the constants
 * `π` / `pi` / `e`.
 */
export function evalExpression(input: string): number {
    const trimmed = input.trim();
    if (!trimmed) throw new ExpressionError('Empty expression');
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) throw new ExpressionError('Empty expression');
    return parse(tokens);
}
