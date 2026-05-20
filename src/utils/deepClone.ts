/**
 * Deep clone using the platform's structured-clone algorithm. Handles
 * Date, RegExp, Map, Set, typed arrays, circular references - and does
 * not need JSON.parse(JSON.stringify(...)), which silently corrupts
 * NaN, Infinity, Date, Map, Set, and bigint.
 *
 * Available in Node 17+ and every evergreen browser since 2022.
 */
export function deepClone<T>(value: T): T {
    return structuredClone(value);
}
