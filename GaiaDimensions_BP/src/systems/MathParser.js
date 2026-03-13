import { Vec3 } from "../Vec3.js";

/**
 * A robust Recursive Descent Parser for mathematical expressions.
 * Supports numbers, scientific notation, vectors, functions, and infix operators.
 */
export class MathParser {
    static getContext(extra = {}) {
        return {
            v: (x, y, z) => ({ x: Number(x), y: Number(y), z: Number(z) }),
            vec3: (x, y, z) => ({ x: Number(x), y: Number(y), z: Number(z) }),
            add: (v1, v2) => Vec3.add(v1, v2),
            sub: (v1, v2) => Vec3.subtract(v1, v2),
            mul: (v, s) => typeof v === 'number' ? v * s : Vec3.multiply(v, s),
            div: (v, s) => typeof v === 'number' ? v / s : Vec3.divide(v, s),
            dot: (v1, v2) => Vec3.dot(v1, v2),
            cross: (v1, v2) => Vec3.cross(v1, v2),
            mag: (v) => Vec3.magnitude(v),
            magnitude: (v) => Vec3.magnitude(v),
            norm: (v) => Vec3.normalize(v),
            normalize: (v) => Vec3.normalize(v),
            dist: (v1, v2) => Vec3.distance(v1, v2),
            distance: (v1, v2) => Vec3.distance(v1, v2),
            lerp: (v1, v2, t) => Vec3.lerp(v1, v2, t),
            floor: (v) => typeof v === 'number' ? Math.floor(v) : Vec3.floor(v),
            ceil: (v) => typeof v === 'number' ? Math.ceil(v) : Vec3.ceil(v),
            round: (v) => typeof v === 'number' ? Math.round(v) : Vec3.round(v),
            abs: (v) => typeof v === 'number' ? Math.abs(v) : Vec3.abs(v),
            min: (a, b) => typeof a === 'number' ? Math.min(a, b) : Vec3.min(a, b),
            max: (a, b) => typeof a === 'number' ? Math.max(a, b) : Vec3.max(a, b),
            pi: () => Math.PI,
            e: () => Math.E,
            sin: (x) => Math.sin(x),
            cos: (x) => Math.cos(x),
            tan: (x) => Math.tan(x),
            sqrt: (x) => Math.sqrt(x),
            pow: (x, y) => Math.pow(x, y),
            log: (x) => Math.log(x),
            log10: (x) => Math.log10(x),
            random: () => Math.random(),
            // Simple linear solver: ax + b = 0 => x = -b/a
            solve_linear: (a, b) => -b / a,
            // Quadratic solver: ax^2 + bx + c = 0
            solve_quadratic: (a, b, c) => {
                const d = b * b - 4 * a * c;
                if (d < 0) return "No real roots";
                if (d === 0) return [-b / (2 * a)];
                return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
            },
            // Universal numerical solver using Secant method for f(x) = 0
            solve: (exprStr, guess1 = 0, guess2 = 1) => {
                if (typeof exprStr !== 'string') return "Error: solve() requires a string expression (e.g., 'x^2 - 4'). Use single quotes.";
                
                // Support equations with '=' by transforming 'A = B' into 'A - (B)'
                let finalExpr = exprStr;
                if (exprStr.includes('=') && !exprStr.includes('<=') && !exprStr.includes('>=') && !exprStr.includes('==')) {
                    const parts = exprStr.split('=');
                    finalExpr = `${parts[0]} - (${parts[1]})`;
                }

                let x0 = Number(guess1);
                let x1 = Number(guess2);
                let f0 = MathParser.evaluate(finalExpr, { ...extra, x: x0 });
                let f1 = MathParser.evaluate(finalExpr, { ...extra, x: x1 });
                
                for (let i = 0; i < 100; i++) {
                    if (Math.abs(f1) < 1e-10) return x1;
                    if (Math.abs(f1 - f0) < 1e-15) break; // Avoid division by zero
                    
                    let x2 = x1 - f1 * ((x1 - x0) / (f1 - f0));
                    x0 = x1;
                    f0 = f1;
                    x1 = x2;
                    f1 = MathParser.evaluate(finalExpr, { ...extra, x: x1 });
                }
                return Math.abs(f1) < 1e-5 ? x1 : "No real solution found near guesses";
            },
            ...extra
        };
    }

    static evaluate(expression, extra = {}) {
        const tokens = this.tokenize(expression);
        const context = this.getContext(extra);
        let pos = 0;

        const peek = () => tokens[pos];
        const consume = () => tokens[pos++];

        const parsePrimary = () => {
            let token = consume();
            if (!token) throw new Error("Unexpected end of expression");

            // Handle unary minus
            if (token === "-") {
                const val = parsePrimary();
                return typeof val === 'number' ? -val : Vec3.multiply(val, -1);
            }

            // Handle parenthesis
            if (token === "(") {
                const val = parseExpr();
                if (consume() !== ")") throw new Error("Expected ')'");
                return val;
            }

            // Handle strings
            if (token.startsWith("'") || token.startsWith('"')) {
                return token.slice(1, -1);
            }

            // Handle numbers
            if (!isNaN(token)) return Number(token);

            // Handle functions and constants
            const lowerToken = token.toLowerCase();
            if (context[lowerToken] !== undefined) {
                const entry = context[lowerToken];
                if (typeof entry === 'function') {
                    if (peek() === "(") {
                        consume(); // "("
                        const args = [];
                        if (peek() !== ")") {
                            args.push(parseExpr());
                            while (peek() === ",") {
                                consume(); // ","
                                args.push(parseExpr());
                            }
                        }
                        if (consume() !== ")") throw new Error(`Expected ')' after arguments for ${token}`);
                        return entry(...args);
                    } else {
                        // If it's a constant function (like pi or e)
                        try { return entry(); } catch(e) { return entry; }
                    }
                } else {
                    // It's a direct value (like pos or x)
                    return entry;
                }
            }

            // For variable 'x' passed dynamically
            if (token.toLowerCase() === 'x' && extra.x !== undefined) {
                return extra.x;
            }

            // Handle variables and dot notation (e.g., pos.x)
            let current = context[lowerToken] !== undefined ? context[lowerToken] : extra[lowerToken];
            if (current !== undefined) {
                while (peek() === ".") {
                    consume(); // consume "."
                    const prop = consume();
                    if (!prop) throw new Error("Expected property name after '.'");
                    current = current[prop];
                }

                if (typeof current === 'function') {
                    if (peek() === "(") {
                        consume(); // "("
                        const args = [];
                        if (peek() !== ")") {
                            args.push(parseExpr());
                            while (peek() === ",") {
                                consume(); // ","
                                args.push(parseExpr());
                            }
                        }
                        if (consume() !== ")") throw new Error(`Expected ')' after arguments for ${token}`);
                        return current(...args);
                    } else {
                        try { return current(); } catch(e) { return current; }
                    }
                }
                return current;
            }

            throw new Error(`Unexpected token: '${token}'`);
        };

        const parseImplicitMul = () => {
            let left = parsePrimary();
            // If next token is a number, variable, or "(", and not an operator, it's implicit multiplication
            while (peek() && !["+", "-", "*", "/", "^", ",", ")", "<", ">", "=", "<=", ">="].includes(peek()) && !/^[0-9]/.test(peek()) === false) {
                // Peek is a number, variable, or "("
                const right = parsePrimary();
                left = (typeof left === 'number' && typeof right === 'number') ? left * right : 
                       (typeof left === 'object') ? Vec3.multiply(left, right) : Vec3.multiply(right, left);
            }
            // Simplified implicit mul check for x, pi, etc.
            while (peek() && (peek() === "(" || /^[a-zA-Z_x]/.test(peek()))) {
                const right = parsePrimary();
                left = (typeof left === 'number' && typeof right === 'number') ? left * right : 
                       (typeof left === 'object') ? Vec3.multiply(left, right) : Vec3.multiply(right, left);
            }
            return left;
        };

        const parsePower = () => {
            let left = parseImplicitMul();
            while (peek() === "^") {
                consume(); // consume "^"
                const right = parseImplicitMul();
                left = Math.pow(left, right);
            }
            return left;
        };

        const parseMulDiv = () => {
            let left = parsePower();
            while (peek() === "*" || peek() === "/") {
                const op = consume();
                const right = parsePower();
                if (op === "*") {
                    left = (typeof left === 'number' && typeof right === 'number') ? left * right : 
                           (typeof left === 'object') ? Vec3.multiply(left, right) : Vec3.multiply(right, left);
                } else {
                    left = (typeof left === 'number') ? left / right : Vec3.divide(left, right);
                }
            }
            return left;
        };

        const parseAddSub = () => {
            let left = parseMulDiv();
            while (peek() === "+" || peek() === "-") {
                const op = consume();
                const right = parseMulDiv();
                if (op === "+") {
                    left = (typeof left === 'number' && typeof right === 'number') ? left + right : Vec3.add(left, right);
                } else {
                    left = (typeof left === 'number' && typeof right === 'number') ? left - right : Vec3.subtract(left, right);
                }
            }
            return left;
        };

        const parseComparison = () => {
            let left = parseAddSub();
            while (peek() === "<" || peek() === ">" || peek() === "=" || peek() === "<=" || peek() === ">=") {
                const op = consume();
                const right = parseAddSub();
                if (op === "<") left = left < right;
                else if (op === ">") left = left > right;
                else if (op === "=") left = left == right;
                else if (op === "<=") left = left <= right;
                else if (op === ">=") left = left >= right;
            }
            return left;
        };

        const parseExpr = () => parseComparison();

        const result = parseExpr();
        if (pos < tokens.length) throw new Error(`Unexpected extra tokens starting at '${tokens[pos]}'`);
        return result;
    }

    static tokenize(str) {
        // Regex handles strings in quotes, numbers with scientific notation, identifiers, and operators
        const regex = /"[^"]*"|'[^']*'|[a-zA-Z_]+|[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?|\(|\)|,|\+|\-|\*|\/|\^|\<=|\>=|\<|\>|\=/gi;
        return str.match(regex) || [];
    }
}
