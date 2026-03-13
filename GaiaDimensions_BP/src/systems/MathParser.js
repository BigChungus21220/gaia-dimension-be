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
            solve: (a, b, c) => {
                const d = b * b - 4 * a * c;
                if (d < 0) return "No real roots";
                if (d === 0) return [-b / (2 * a)];
                return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
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
                    // It's a direct value (like pos)
                    return entry;
                }
            }

            throw new Error(`Unexpected token: '${token}'`);
        };

        const parseMulDiv = () => {
            let left = parsePrimary();
            while (peek() === "*" || peek() === "/") {
                const op = consume();
                const right = parsePrimary();
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

        const parseExpr = () => parseAddSub();

        const result = parseExpr();
        if (pos < tokens.length) throw new Error(`Unexpected extra tokens starting at '${tokens[pos]}'`);
        return result;
    }

    static tokenize(str) {
        const regex = /[a-zA-Z_]+|[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?|\(|\)|,|\+|\-|\*|\//gi;
        return str.match(regex) || [];
    }
}
