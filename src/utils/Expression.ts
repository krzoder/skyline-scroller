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
 * command — eliminates the arbitrary-code-execution surface
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

function tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const s = input;

    while (i < s.length) {
        const c = s[i];

        if (c === ' ' || c === '\t' || c === '\n') {
            i++;
            continue;
        }

        if (c === '+' || c === '-' || c === '*' || c === '/') {
            tokens.push({ type: 'op', value: c });
            i++;
            continue;
        }

        if (c === '(') { tokens.push({ type: 'lparen' }); i++; continue; }
        if (c === ')') { tokens.push({ type: 'rparen' }); i++; continue; }

        // Number: digits, optional decimal, optional exponent (e.g. 1e3).
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

        // Constants. Only 'pi', 'π', and standalone 'e' (not part of a number).
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

function isIdentChar(c: string | undefined): boolean {
    if (!c) return false;
    return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c === '_';
}

class Parser {
    private tokens: Token[];
    private pos: number = 0;

    constructor(tokens: Token[]) { this.tokens = tokens; }

    parseExpression(): number {
        const value = this.parseExpr();
        if (this.pos < this.tokens.length) {
            throw new ExpressionError(`Unexpected token after expression (position ${this.pos})`);
        }
        return value;
    }

    private parseExpr(): number {
        let value = this.parseTerm();
        while (this.peekOp('+') || this.peekOp('-')) {
            const op = this.tokens[this.pos++] as { type: 'op'; value: '+' | '-' };
            const rhs = this.parseTerm();
            value = op.value === '+' ? value + rhs : value - rhs;
        }
        return value;
    }

    private parseTerm(): number {
        let value = this.parseFactor();
        while (this.peekOp('*') || this.peekOp('/')) {
            const op = this.tokens[this.pos++] as { type: 'op'; value: '*' | '/' };
            const rhs = this.parseFactor();
            if (op.value === '*') value *= rhs;
            else value /= rhs; // Infinity / NaN for /0 are allowed; callers clamp.
        }
        return value;
    }

    private parseFactor(): number {
        if (this.peekOp('+')) { this.pos++; return this.parseFactor(); }
        if (this.peekOp('-')) { this.pos++; return -this.parseFactor(); }
        return this.parseAtom();
    }

    private parseAtom(): number {
        const t = this.tokens[this.pos];
        if (!t) throw new ExpressionError('Unexpected end of expression');
        if (t.type === 'num') { this.pos++; return t.value; }
        if (t.type === 'lparen') {
            this.pos++;
            const value = this.parseExpr();
            const close = this.tokens[this.pos];
            if (!close || close.type !== 'rparen') throw new ExpressionError('Missing closing parenthesis');
            this.pos++;
            return value;
        }
        throw new ExpressionError(`Unexpected token at position ${this.pos}`);
    }

    private peekOp(op: '+' | '-' | '*' | '/'): boolean {
        const t = this.tokens[this.pos];
        return !!t && t.type === 'op' && t.value === op;
    }
}

/**
 * Evaluate a math expression containing only +, -, *, /, parens, unary +/-,
 * numeric literals (including 1e3-style exponents), and the constants
 * `π` / `pi` / `e`.
 *
 * Throws `ExpressionError` on any other token, mismatched parens, or
 * empty input.
 */
export function evalExpression(input: string): number {
    const trimmed = input.trim();
    if (!trimmed) throw new ExpressionError('Empty expression');
    const tokens = tokenize(trimmed);
    if (tokens.length === 0) throw new ExpressionError('Empty expression');
    return new Parser(tokens).parseExpression();
}
