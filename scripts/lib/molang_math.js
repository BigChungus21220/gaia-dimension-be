const createProxy = (prefix) => new Proxy({}, { 
    get: (_, p) => `${prefix}.${p}`
});

export const q = createProxy('q');
export const v = createProxy('v');
export const t = createProxy('t');
export const Mth = createProxy('math');

export function loop(count, body) { if (typeof body === 'function') body(); }

export class Molang {
    static findClosingBrace(str, startIndex) {
        let depth = 0;
        for (let i = startIndex; i < str.length; i++) {
            if (str[i] === '{') depth++;
            else if (str[i] === '}') {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    static compile(input) {
        if (!input) return "";
        let code = String(input);

        // --- 1. Basic Replacements ---
        // We only do name-to-dot notation if it's NOT already in dot notation
        return code
            .replace(/Math\./g, 'math.')
            .replace(/Mth\./g, 'math.')
            .replace(/([0-9.]+)[fF]\b/g, '$1')
            .replace(/query\./g, 'q.')
            .replace(/variable\./g, 'v.')
            .replace(/temp\./g, 't.')
            .replace(/\s+/g, ' ') // Collapse spaces but keep them
            .trim();
    }
}

export function molang(strings, ...values) {
    let result = '';
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) result += String(values[i]);
    }
    return Molang.compile(result);
}
