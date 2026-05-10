import { Vector3 } from "@minecraft/server";
import { Vec3 } from "../Vec3.js";

/**
 * Recursive type for the result of the parser.
 */
export type MathResult = number | boolean | Vector3 | string | MathResult[];

/**
 * Context for the math parser, mapping identifiers to values or functions.
 */
export interface MathContext {
    [key: string]: MathResult | ((...args: any[]) => MathResult);
}

/**
 * A robust Recursive Descent Parser for mathematical expressions.
 * Supports numbers, scientific notation, vectors, functions, and infix operators.
 */
export class MathParser {
    /**
     * Gets the default context with standard math and vector functions.
     * @param extra Optional extra context to merge.
     */
    static getContext(extra: MathContext = {}): MathContext {
        return {
            v: (x: number, y: number, z: number): Vector3 => ({ x: Number(x), y: Number(y), z: Number(z) }),
            vec3: (x: number, y: number, z: number): Vector3 => ({ x: Number(x), y: Number(y), z: Number(z) }),
            add: (v1: Vector3, v2: Vector3): Vector3 => Vec3.add(v1, v2),
            sub: (v1: Vector3, v2: Vector3): Vector3 => Vec3.subtract(v1, v2),
            mul: (v: MathResult, s: number): MathResult => typeof v === 'number' ? v * s : Vec3.multiply(v as Vector3, s),
            div: (v: MathResult, s: number): MathResult => typeof v === 'number' ? v / s : Vec3.divide(v as Vector3, s),
            dot: (v1: Vector3, v2: Vector3): number => Vec3.dot(v1, v2),
            cross: (v1: Vector3, v2: Vector3): Vector3 => Vec3.cross(v1, v2),
            mag: (v: Vector3): number => Vec3.magnitude(v),
            magnitude: (v: Vector3): number => Vec3.magnitude(v),
            norm: (v: Vector3): Vector3 => Vec3.normalize(v),
            normalize: (v: Vector3): Vector3 => Vec3.normalize(v),
            dist: (v1: Vector3, v2: Vector3): number => Vec3.distance(v1, v2),
            distance: (v1: Vector3, v2: Vector3): number => Vec3.distance(v1, v2),
            lerp: (v1: Vector3, v2: Vector3, t: number): Vector3 => Vec3.lerp(v1, v2, t),
            floor: (v: MathResult): MathResult => typeof v === 'number' ? Math.floor(v) : Vec3.floor(v as Vector3),
            ceil: (v: MathResult): MathResult => typeof v === 'number' ? Math.ceil(v) : Vec3.ceil(v as Vector3),
            round: (v: MathResult): MathResult => typeof v === 'number' ? Math.round(v) : Vec3.round(v as Vector3),
            abs: (v: MathResult): MathResult => typeof v === 'number' ? Math.abs(v) : Vec3.abs(v as Vector3),
            min: (a: MathResult, b: MathResult): MathResult => typeof a === 'number' ? Math.min(a, b as number) : Vec3.min(a as Vector3, b as Vector3),
            max: (a: MathResult, b: MathResult): MathResult => typeof a === 'number' ? Math.max(a, b as number) : Vec3.max(a as Vector3, b as Vector3),
            pi: (): number => Math.PI,
            e: (): number => Math.E,
            sin: (x: number): number => Math.sin(x),
            cos: (x: number): number => Math.cos(x),
            tan: (x: number): number => Math.tan(x),
            sqrt: (x: number): number => Math.sqrt(x),
            pow: (x: number, y: number): number => Math.pow(x, y),
            log: (x: number): number => Math.log(x),
            log10: (x: number): number => Math.log10(x),
            random: (): number => Math.random(),
            // Simple linear solver: ax + b = 0 => x = -b/a
            solve_linear: (a: number, b: number): number => -b / a,
            // Quadratic solver: ax^2 + bx + c = 0
            solve_quadratic: (a: number, b: number, c: number): MathResult => {
                const d = b * b - 4 * a * c;
                if (d < 0) return "No real roots";
                if (d === 0) return [-b / (2 * a)];
                return [(-b + Math.sqrt(d)) / (2 * a), (-b - Math.sqrt(d)) / (2 * a)];
            },
            // Universal numerical solver using Secant method for f(x) = 0
            solve: (exprStr: string, guess1: number = 0, guess2: number = 1): MathResult => {
                if (typeof exprStr !== 'string') return "Error: solve() requires a string expression (e.g., 'x^2 - 4'). Use single quotes.";
                
                // Support equations with '=' by transforming 'A = B' into 'A - (B)'
                let finalExpr = exprStr;
                if (exprStr.includes('=') && !exprStr.includes('<=') && !exprStr.includes('>=') && !exprStr.includes('==')) {
                    const parts = exprStr.split('=');
                    finalExpr = `${parts[0]} - (${parts[1]})`;
                }

                let x0 = Number(guess1);
                let x1 = Number(guess2);
                let f0 = MathParser.evaluate(finalExpr, { ...extra, x: x0 }) as number;
                let f1 = MathParser.evaluate(finalExpr, { ...extra, x: x1 }) as number;
                
                for (let i = 0; i < 100; i++) {
                    if (Math.abs(f1) < 1e-10) return x1;
                    if (Math.abs(f1 - f0) < 1e-15) break; // Avoid division by zero
                    
                    let x2 = x1 - f1 * ((x1 - x0) / (f1 - f0));
                    x0 = x1;
                    f0 = f1;
                    x1 = x2;
                    f1 = MathParser.evaluate(finalExpr, { ...extra, x: x1 }) as number;
                }
                return Math.abs(f1) < 1e-5 ? x1 : "No real solution found near guesses";
            },
            ...extra
        };
    }

    /**
     * Evaluates a mathematical expression and returns the result.
     * @param expression The expression string to evaluate.
     * @param extra Optional extra context variables or functions.
     */
    static evaluate(expression: string, extra: MathContext = {}): MathResult {
        const tokens = this.tokenize(expression);
        const context = this.getContext(extra);
        let pos = 0;

        const peek = (): string | undefined => tokens[pos];
        const consume = (): string | undefined => tokens[pos++];

        const parsePrimary = (): MathResult => {
            let token = consume();
            if (!token) throw new Error("Unexpected end of expression");

            // Handle unary minus
            if (token === "-") {
                const val = parsePrimary();
                return typeof val === 'number' ? -val : Vec3.multiply(val as Vector3, -1);
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
            if (!isNaN(Number(token))) return Number(token);

            // Handle functions and constants
            const lowerToken = token.toLowerCase();
            
            // Handle variable 'x' passed dynamically
            if (lowerToken === 'x' && extra.x !== undefined) {
                return extra.x as MathResult;
            }

            if (context[lowerToken] !== undefined) {
                let current: any = context[lowerToken];
                // Dot notation
                while (peek() === ".") {
                    consume();
                    const prop = consume();
                    if (!prop) throw new Error("Expected property name after '.'");
                    current = current[prop];
                }

                if (typeof current === 'function') {
                    if (peek() === "(") {
                        consume(); // "("
                        const args: MathResult[] = [];
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
                        // If it's a constant function (like pi or e)
                        try { return current(); } catch(e) { return current; }
                    }
                } else {
                    return current;
                }
            }

            // Handle variables from extra context
            if (extra[lowerToken] !== undefined) {
                let current: any = extra[lowerToken];
                while (peek() === ".") {
                    consume();
                    const prop = consume();
                    if (!prop) throw new Error("Expected property name after '.'");
                    current = current[prop];
                }
                return current as MathResult;
            }

            throw new Error(`Unexpected token: '${token}'`);
        };

        const parsePower = (): MathResult => {
            let left = parsePrimary();
            while (peek() === "^") {
                consume();
                const right = parsePrimary();
                left = Math.pow(left as number, right as number);
            }
            return left;
        };

        const parseImplicitMul = (): MathResult => {
            let left = parsePower();
            // Implicit multiplication support (e.g., 4x or 4(x+1))
            // If next token is a number, variable, or "(", and not an operator, it's implicit multiplication
            while (peek() && !["+", "-", "*", "/", "^", ",", ")", "<", ">", "=", "<=", ">="].includes(peek()!)) {
                const right = parsePower();
                left = (typeof left === 'number' && typeof right === 'number') ? left * right : 
                       (typeof left === 'object') ? Vec3.multiply(left as Vector3, right as number) : Vec3.multiply(right as Vector3, left as number);
            }
            return left;
        };

        const parseMulDiv = (): MathResult => {
            let left = parseImplicitMul();
            while (peek() === "*" || peek() === "/") {
                const op = consume();
                const right = parseImplicitMul();
                if (op === "*") {
                    left = (typeof left === 'number' && typeof right === 'number') ? left * right : 
                           (typeof left === 'object') ? Vec3.multiply(left as Vector3, right as number) : Vec3.multiply(right as Vector3, left as number);
                } else {
                    left = (typeof left === 'number') ? left / (right as number) : Vec3.divide(left as Vector3, right as number);
                }
            }
            return left;
        };

        const parseAddSub = (): MathResult => {
            let left = parseMulDiv();
            while (peek() === "+" || peek() === "-") {
                const op = consume();
                const right = parseMulDiv();
                if (op === "+") {
                    left = (typeof left === 'number' && typeof right === 'number') ? left + right : Vec3.add(left as Vector3, right as Vector3);
                } else {
                    left = (typeof left === 'number' && typeof right === 'number') ? left - right : Vec3.subtract(left as Vector3, right as Vector3);
                }
            }
            return left;
        };

        const parseComparison = (): MathResult => {
            let left = parseAddSub();
            while (peek() === "<" || peek() === ">" || peek() === "=" || peek() === "<=" || peek() === ">=") {
                const op = consume();
                const right = parseAddSub();
                if (op === "<") left = (left as any) < (right as any);
                else if (op === ">") left = (left as any) > (right as any);
                else if (op === "=") left = (left as any) == (right as any);
                else if (op === "<=") left = (left as any) <= (right as any);
                else if (op === ">=") left = (left as any) >= (right as any);
            }
            return left;
        };

        const parseExpr = (): MathResult => parseComparison();

        const result = parseExpr();
        if (pos < tokens.length) throw new Error(`Unexpected extra tokens starting at '${tokens[pos]}'`);
        return result;
    }

    /**
     * Tokenizes an expression string into an array of tokens.
     * @param str The expression string to tokenize.
     */
    static tokenize(str: string): string[] {
        // Regex handles strings in quotes, numbers with scientific notation, identifiers, . notation, and operators
        const regex = /"[^"]*"|'[^']*'|[a-zA-Z_]+|[0-9]*\.?[0-9]+(?:e[+-]?[0-9]+)?|\.|\(|\)|,|\+|\-|\*|\/|\^|\<=|\>=|\<|\>|\=/gi;
        return str.match(regex) || [];
    }
}
