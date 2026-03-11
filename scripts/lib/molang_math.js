const createProxy = (prefix) => new Proxy({}, { 
    get: (_, p) => `${prefix}.${p}`
});

export const q = createProxy('query');
export const v = createProxy('variable');
export const t = createProxy('temp');
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
        let code = typeof input === 'function' ? input.toString() : String(input);

        if (typeof input === 'function') {
            if (code.includes('=>') && !code.includes('{')) {
                code = code.split('=>')[1].trim();
            } else {
                const start = code.indexOf('{');
                const end = code.lastIndexOf('}');
                code = (start !== -1 && end !== -1) ? code.substring(start + 1, end) : code;
            }
        }

        // --- 1. Basic Keyword Replacements ---
        // (Do this before complex transformations to clean up the code)
        let res = code
            .replace(/\b(?:const|let)\s+/g, '')
            .replace(/return\s+/g, '')
            .replace(/Math\./g, 'math.')
            .replace(/Mth\./g, 'math.')
            .replace(/([0-9.]+)[fF]\b/g, '$1')
            .replace(/q\./g, 'query.')
            .replace(/v\./g, 'variable.')
            .replace(/t\./g, 'temp.');

        // --- 2. Variable Map & Promotion ---
        const declRegex = /\b(?:const|let)\s+([a-zA-Z0-9_]+)\b/g;
        let match;
        while ((match = declRegex.exec(code)) !== null) {
            const name = match[1];
            const target = name.startsWith('v_') ? `variable.${name.substring(2)}` : `temp.${name}`;
            res = res.replace(new RegExp(`\\b${name}\\b`, 'g'), target);
        }

        // --- 3. Recursive Statement Parser ---
        const parseStatements = (str) => {
            let output = "";
            let i = 0;
            while (i < str.length) {
                // Peek for keywords
                const substr = str.substring(i);
                
                // LOOP
                const loopMatch = substr.match(/^\bloop\s*\(([^,]+),\s*(?:\(\)\s*=>\s*)?\{/);
                if (loopMatch) {
                    const count = loopMatch[1].trim();
                    const bodyStart = i + substr.indexOf('{');
                    const bodyEnd = this.findClosingBrace(str, bodyStart);
                    if (bodyEnd !== -1) {
                        const body = str.substring(bodyStart + 1, bodyEnd);
                        output += `loop(${count}, { ${parseStatements(body)} })`;
                        i = bodyEnd + 1;
                        continue;
                    }
                }

                // IF
                const ifMatch = substr.match(/^\bif\s*\(([^)]+)\)\s*\{/);
                if (ifMatch) {
                    const cond = ifMatch[1].trim();
                    const bodyStart = i + substr.indexOf('{');
                    const bodyEnd = this.findClosingBrace(str, bodyStart);
                    if (bodyEnd !== -1) {
                        const body = str.substring(bodyStart + 1, bodyEnd);
                        const compiledBody = parseStatements(body);
                        
                        // Check for else
                        let elsePart = "0";
                        let nextIdx = bodyEnd + 1;
                        const rest = str.substring(nextIdx).trim();
                        if (rest.startsWith('else')) {
                            const elseStartIdx = nextIdx + str.substring(nextIdx).indexOf('{');
                            const elseEndIdx = this.findClosingBrace(str, elseStartIdx);
                            if (elseEndIdx !== -1) {
                                const elseBody = str.substring(elseStartIdx + 1, elseEndIdx);
                                elsePart = parseStatements(elseBody);
                                output += `(${cond}) ? { ${compiledBody} } : { ${elsePart} }`;
                                i = elseEndIdx + 1;
                                continue;
                            }
                        }
                        
                        output += `(${cond}) ? { ${compiledBody} } : { 0 }`;
                        i = bodyEnd + 1;
                        continue;
                    }
                }

                // Normal character
                output += str[i];
                i++;
            }
            return output;
        };

        res = parseStatements(res);

        // Final cleanup
        return res
            .split('\n')
            .map(l => l.trim())
            .filter(l => l.length > 0)
            .join(' ')
            .replace(/;\s*/g, '; ')
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
