/*
    Better Vectors by Bigchungus21220

    Provides vector operations and conversions for minecraft bedrock scripting (although it should work for anything).
    Now with vec2 and vec4, jsDoc documentation, error logging, swizzling, and even more math functions

    to use in your script:
        import { vec3 } from 'scripts/Vector.js'; 
*/

export { vec2, vec3, vec4, Vec2, Vec3, Vec4 };

//#region vec2
/**
* Creates a Vec2
*
* Input options:
*
* Vec2 vec2() - returns zero vector
*
* Vec2 vec2(number a) - returns vector [a,a]
*
* Vec2 vec2(vector-like a) - returns vector [a.x,a.z]
*
* Vec2 vec2(number a, number b) - returns vector [a,b]
*
* @see {@link Vec2}
**/
function vec2(a,b){
    if (a === undefined) { //no paramters
        return new Vec2(0,0);
    } else if (b === undefined) { //one parameter
        if (typeof a == "number") { //single number input
            return new Vec2(a,a);
        } else { //vector-like input
            if (a.x && a.y){
                return new Vec2(a.x,a.y);
            } else {
                throw new Error("x and/or y components not found in input object");
            }
        }
    } else { //two parameters
        if (typeof a == "number" && typeof b == "number"){
            return new Vec2(a,b);
        }
        throw new Error("Two parameter constructor inputs must all be a numbers");
    }
}

/**
* A 2 dimensional vector with components xy or uv
**/
class Vec2 {
    /**
    * x component of vector
    * @see {@link Vec2}
    **/
    x = 0;
    /**
    * y component of vector
    * @see {@link Vec2}
    **/
    y = 0;

    /**
    * u or x component of vector
    * @see {@link Vec2}
    **/
    get u(){
        return this.x
    }
    
    /**
    * v or y component of vector
    * @see {@link Vec2}
    **/
    get v(){
        return this.y
    }

    /**
    * Create a Vec2
    * @param {number} x x component of vector
    * @param {number} y y component of vector
    * @return {Vec3} vector with given x, y, and z components
    * @see {@link Vec2}, {@link vec2}
    **/
    constructor(x,y) {
        if (typeof x == "number" && typeof y == "number"){
            this.x = x;
            this.y = y;
        } else {
            throw new Error("All constructor inputs must be numbers");
        }
    }
    
    /**
    * Converts this vector to a string
    * @return {Vec2} This vector in the form "this.x this.y"
    * @see {@link toObject}
    **/
    toString(){
        return this.x + " " + this.y;
    }

    /**
    * Converts this vector to javascript object
    * @return {Vec2} This vector in the form {x:this.x, y:this.y}
    * @see {@link toString}
    **/
    toObject(){
        return {x:this.x, y:this.y};
    }

    /**
    * Adds to this vector
    * @param {number|Vec2} a Number or vector to add to this vector
    * @return {Vec2} The sum
    * @see {@link subtract}
    **/
    add(a){
        if (typeof a == "number"){
            return vec3(this.x + a, this.y + a);
        } else if (a instanceof Vec2){
            return vec3(this.x + a.x, this.y + a.y);
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * Subtracts from this vector
    * @param {number|Vec2} a Number or vector to subtract from this vector
    * @return {Vec2} The difference
    * @see {@link add}
    **/
    subtract(a){
        if (typeof a == "number"){
            return vec2(this.x - a, this.y - a);
        } else if (a instanceof Vec2){
            return vec2(this.x - a.x, this.y - a.y);
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * Multiplies this vector
    * @param {number|Vec2} a Number or vector to multiply this vector by
    * @return {Vec2} The product
    * @see {@link divide}
    **/
    multiply(a){
        if (typeof a == "number"){
            return vec2(this.x * a, this.y * a);
        } else if (a instanceof Vec2){
            return vec2(this.x * a.x, this.y * a.y);
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * Divides this vector
    * @param {number|Vec2} a Number or vector to divide this vector by
    * @return {Vec2} The quotient
    * @see {@link multiply}, {@link mod}
    **/
    divide(a){
        if (typeof a == "number"){
            return vec2(this.x / a, this.y / a);
        } else if (a instanceof Vec2){
            return vec2(this.x / a.x, this.y / a.y);
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * The modulo of a vector and a number or a vector and a vector
    * @param {number | Vec2} a Other number or vector to take modulo with
    * @return {Vec2} The modulo of this vector and a
    * @see {@link divide}
    **/
    mod(a){
        if (a instanceof Vec2){
            return vec2(Math.mod(this.x,a.x), Math.mod(this.y,a.y));
        } else if (typeof a == "number"){
            return vec2(Math.mod(this.x,a), Math.mod(this.y,a));
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * The sine of this vector
    * @return {Vec2} The sine
    * @see {@link asin}, {@link cos}, {@link tan}
    **/
    sin(){
        return vec2(Math.sin(this.x), Math.sin(this.y));
    }

    /**
    * The cosine of this vector
    * @return {Vec2} The cosine
    * @see {@link acos}, {@link sin}, {@link tan}
    **/
    cos(){
        return vec2(Math.cos(this.x), Math.cos(this.y));
    }

    /**
    * The tangent of this vector
    * @return {Vec2} The tangent
    * @see {@link atan}, {@link sin}, {@link cos}
    **/
    tan(){
        return vec2(Math.tan(this.x), Math.tan(this.y));
    }

    /**
    * The arcsine of this vector
    * @return {Vec2} The arcsine
    * @see {@link sin}, {@link asin}, {@link acos}, {@link atan}
    **/
    asin(){
        return vec2(Math.asin(this.x), Math.asin(this.y));
    }

    /**
    * The arccosine of this vector
    * @return {Vec2} The arccosine
    * @see {@link cos}, {@link asin}, {@link acos}, {@link atan}
    **/
    acos(){
        return vec2(Math.acos(this.x), Math.acos(this.y));
    }

    /**
    * The arctangent of this vector
    * @return {Vec2} The arctangent
    * @see {@link tan}, {@link asin}, {@link acos}, {@link atan}
    **/
    atan(){
        return vec3(Math.atan(this.x), Math.atan(this.y));
    }

    /**
    * This vector raised to a power
    * @param {number} p Power to raise vector to
    * @return {Vec2} This vector raised to p
    * @see {@link sqrt}, {@link exp}
    **/
    pow(p){
        if (typeof p == "number"){
            return vec2(Math.pow(this.x,p), Math.pow(this.y,p));
        } else {
            throw new Error("Power must be a number");
        }
    }

    /**
    * The square root of this vector
    * @return {Vec2} The squart root of this vector
    * @see {@link pow}, {@link cbrt}
    **/
    sqrt(){
        if (this.x >= 0 && this.y >= 0){
            return vec2(Math.sqrt(this.x), Math.sqrt(this.y));
        } else {
            throw new Error("Cannot take the square root of a negative number");
        }
    }

    /**
    * The cube root of this vector
    * @return {Vec2} The cube root of this vector
    * @see {@link pow}, {@link sqrt}
    **/
    cbrt(){
        return vec2(Math.cbrt(this.x), Math.cbrt(this.y));
    }

    /**
    * x raised to this vector
    * @param {number} x Base of the exponentiation
    * @return {Vec2} a raised to this vector
    * @see {@link pow}, {@link log}
    **/
    exp(x){
        if (typeof x == "number"){
            return vec2(Math.pow(x,this.x), Math.pow(x,this.y));
        } else {
            throw new Error("Base must be a number");
        }
    }

    /**
    * The natural logarithm (base e) of this vector
    * @return {Vec2} The natural logarithm (base e) of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log10}
    **/
    log(){
        return vec2(Math.log(this.x), Math.log(this.y));
    }

    /**
    * The base 2 logarithm of this vector
    * @return {Vec2} The base 2 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log}, {@link log10}
    **/
    log2(){
        return vec2(Math.log2(this.x), Math.log2(this.y));
    }

    /**
    * The base 10 logarithm of this vector
    * @return {Vec2} The base 10 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log}
    **/
    log10(){
        return vec2(Math.log10(this.x), Math.log10(this.y));
    }

    /**
    * The minumum of a vector and a number or a vector and a vector
    * @param {number | Vec2} a Other number or vector to take min with
    * @return {Vec2} The minimun of this vector and a
    * @see {@link max}, {@link clamp}
    **/
    min(a){
        if (a instanceof Vec2){
            return vec3(Math.min(this.x,a.x), Math.min(this.y,a.y));
        } else if (typeof a == "number"){
            return vec3(Math.min(this.x,a), Math.min(this.y,a));
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * The maximum of a vector and a number or a vector and a vector
    * @param {number | Vec2} a Other number or vector to take max with
    * @return {Vec2} The maximum of this vector and a
    * @see {@link min}, {@link clamp}
    **/
    max(a){
        if (a instanceof Vec2){
            return vec2(Math.max(this.x,a.x), Math.max(this.y,a.y));
        } else if (typeof a == "number"){
            return vec2(Math.max(this.x,a), Math.max(this.y,a));
        } else {
            throw new Error("Input must be number or Vec2");
        }
    }

    /**
    * Clamps the value of the vector to between a and b
    * @param {number | Vec2} low Low end to clamp to
    * @param {number | Vec2} high High end to clamp to
    * @return {Vec2} This vector clamped to between a and b
    * @see {@link min}, {@link max}
    **/
    clamp(low,high){
        if ((low instanceof Vec2 || typeof low == "number") && (high instanceof Vec2 || typeof high == "number")){
            return this.max(this.min(high),low);
        } else {
            throw new Error("Both inputs must be numbers or Vec2s");
        }
    }

    /**
    * Rounds this vector to the nearest 1
    * @return {Vec2} This vector rounded
    * @see {@link floor}, {@link ceil}
    **/
    round(){
        return vec2(Math.round(this.x), Math.round(this.y));
    }

    /**
    * Floors this vector
    * @return {Vec2} The floor of this vector
    * @see {@link round}, {@link ceil}, {@link fract}
    **/
    floor(){
        return vec2(Math.floor(this.x), Math.floor(this.y));
    }

    /**
    * Ceils this vector
    * @return {Vec2} The ceils of this vector
    * @see {@link floor}, {@link round}
    **/
    ceil(){
        return vec2(Math.ceil(this.x), Math.ceil(this.y));
    }

    /**
    * The fractional part of this vector (same as truncate)
    * @return {Vec2} The fractional part of this vector
    * @see {@link floor}
    **/
    fract(){
        return vec2(Math.trunc(this.x), Math.trunc(this.y));
    }

    /**
    * The sign of this vector
    * @return {Vec2} The sign of this vector
    * @see {@link abs}
    **/
    sign(){
        return vec2(Math.sign(this.x), Math.sign(this.y));
    }

    /**
    * The absolute value of this vector
    * @return {Vec2} The absoulute value of this vector
    * @see {@link sign}
    **/
    abs(){
        return vec2(Math.abs(this.x), Math.abs(this.y));
    }

    /**
    * Mixes this vector with another vector based on the interpolant
    * @param {number | Vec2} a Other number or vector to take mix with
    * @param {number | Vec2} x Interpolant number or vector
    * @return {Vec2} The new mixed vector
    * @see {@link smoothstep}
    **/
    mix(a, x){
        if (a instanceof Vec2){
            if (x instanceof Vec2){
                return vec2(Math.lerp(this.x,a.x,x.x), Math.lerp(this.y,a.y,x.y));
            } else if (typeof x == "number"){
                return vec2(Math.lerp(this.x,a.x,x), Math.lerp(this.y,a.y,x));
            } else {
                throw new Error("b must be number or Vec2");
            }
        } else if (typeof a == "number"){
            if (x instanceof Vec2){
                return vec2(Math.lerp(this.x,a,x.x), Math.lerp(this.y,a,x.y));
            } else if (x == "number"){
                return vec2(Math.lerp(this.x,a,x), Math.lerp(this.y,a,x));
            } else {
                throw new Error("b must be number or Vec2");
            }
        } else {
            throw new Error("a must be number or Vec2");
        }
    }

    /**
    * Gets a component of the vector from a string
    * @param {string} str A string that is one of "x", "y", "r", "g"
    * @return {Vec2} The requested component
    * @see {@link swizzle}
    **/
    getComponent(str){
        if (str instanceof String){
            if (str.length == 1){
                if (str == "x"){
                    return this.x
                }
                if (str == "y"){
                    return this.y
                }
                if (str == "r"){
                    return this.r
                }
                if (str == "g"){
                    return this.g
                }
                throw new Error("\"" + str + "\" component not found");
            } else {
                throw new Error("Input must be length 1");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Recombines the specified components to form a new vector (see https://en.wikipedia.org/wiki/Swizzling_(computer_graphics))
    * @param {string} str A string that specifies the pattern for the new vector. eg: "xyy", "gx", or "xrxy"
    * @return {Vec2} A new vector with components from the original vector in their specified order
    * @see {@link getComponent}
    **/
    swizzle(str){ 
        if (str instanceof String){
            if (str.length == 2){
                return vec2(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2))
                );
            } else if (str.length == 3){
                return vec3(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3))
                );
            } else if (str.length == 4){
                return vec4(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3)),
                    this.getComponent(str.substring(3,4))
                );
            } else {
                throw new Error("Input must be 2, 3, or 4 characters long");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Returns the dot product of this vector and another vector
    * @param {Vec2} vector Vector to take the dot product of this vector with
    * @return {number} The dot product of the two vectors
    * @see {@link cross}
    **/
    dot(vector){
        if (vector instanceof Vec2){
            return this.x*vector.x + this.y*vector.y;
        } else {
            throw new Error("Input must be Vec2");
        }
    }

    /**
    * Returns the cross product of this vector and another vector
    * @param {Vec2} vector Vector to take the cross product of this vector with
    * @return {Vec2} The cross product of the two vectors
    * @see {@link dot}
    **/
    cross(vector){
        if (vector instanceof Vec2){
            return this.x*vector.y - this.y*vector.x
        } else {
            throw new Error("Input must be Vec2");
        }
    }

    /**
    * Reflects the vector over a normal
    * @param {Vec2} normal Normal to reflect this vector about
    * @return {Vec2} This vector flipped over the normal
    * @see {@link normalized}
    **/
    reflect(normal){
        if (normal instanceof Vec2){
            return this.subtract(normal.multiply(this.dot(normal)*2));
        } else {
            throw new Error("Normal must be Vec2");
        }
    }

    /**
    * Gets the length squared of this vector
    * @return {number} The length squared of this vector
    * @see {@link length}, {@link normalized}
    **/
    get lengthSquared(){
        return this.x*this.x + this.y*this.y;
    }

    /**
    * Gets the length of this vector
    * @return {number} The length of this vector
    * @see {@link lengthSquared}, {@link normalized}
    **/
    get length(){
        return Math.sqrt(this.lengthSquared);
    }

    /**
    * Gets a vector pointing in the same direction of this vector but with a length of one
    * @return {Vec2} The unit vector facing the same direction as this vector
    * @see {@link length}, {@link lengthSquared}
    **/
    get normalized(){
        let len = this.length;
        if (ls == 0.0){
            console.warn("Vector length is 0, returning 0 vector");
            return vec2(0);
        } else {
            return this.divide(len);
        }
    }
}
//#endregion

//#region vec3
/**
* Creates a Vec3
*
* Input options:
*
* Vec3 vec3() - returns zero vector
*
* Vec3 vec3(number a) - returns vector [a,a,a]
*
* Vec3 vec3(vector-like a) - returns vector [a.x,a.z,a.y]
*
* Vec3 vec3(string a) - returns a unit vector in the specified direction. Options: "up", "down", "east", "west", "north", or "south"
*
* Vec3 vec3(Vec2 a, number b) - returns vector [a.x,a.y,b]
*
* Vec3 vec3(number a, Vec2 b) - returns vector [a,b.x,b.y]
*
* Vec3 vec3(number a, number b, number c) - returns vector [a,b,c]
*
* @see {@link Vec3}
**/
function vec3(a,b,c){
    if (a === undefined) { //no paramters
        return new Vec3(0,0,0);
    } else if (b === undefined) { //one parameter
        if (a instanceof String){ //string input
            const lookup = {
                up: new Vec3(0,1,0),
                down: new Vec3(0,-1,0),
                east: new Vec3(1,0,0),
                west: new Vec3(-1,0,0),
                north: new Vec3(0,0,-1),
                south: new Vec3(0,0,1)
            };
            if (lookup[a]){
                return lookup[a];
            } else {
                throw new Error("String input must be \"up\", \"down\", \"east\", \"west\", \"north\", or \"south\"");
            }
        } else if (typeof a == "number") { //single number input
            return new Vec3(a,a,a);
        } else { //vector-like input
            if (a.x && a.y && a.z){
                return new Vec3(a.x,a.y,a.z);
            } else {
                throw new Error("x, y, and/or z components not found in input object");
            }
        }
    } else if (b === undefined) { //two paramters
        if (a instanceof Vec2 && typeof b == "number"){
            return Vec3(a.x, a.y, b);
        } else if (typeof a == "number" && b instanceof Vec2){
            return Vec3(a, b.x, b.y);
        }
        throw new Error("Two parameter constructor input must be a number and a Vec2");
    } else { //three parameters
        if (typeof a == "number" && typeof b == "number" && typeof c == "number"){
            return new Vec3(a,b,c);
        }
        throw new Error("Three parameter constructor inputs must all be a numbers");
    }
}

/**
* A 3 dimensional vector with components xyz or rgb
**/
class Vec3 {
    /**
    * x component of vector
    * @see {@link Vec3}
    **/
    x = 0;
    /**
    * y component of vector
    * @see {@link Vec3}
    **/
    y = 0;
    /**
    * z component of vector
    * @see {@link Vec3}
    **/
    z = 0;

    /**
    * r (red) or x component of vector
    * @see {@link Vec3}
    **/
    get r(){
        return this.x
    }
    
    /**
    * g (green) or y component of vector
    * @see {@link Vec3}
    **/
    get g(){
        return this.y
    }

    /**
    * b (blue) or z component of vector
    * @see {@link Vec3}
    **/
    get b(){
        return this.z
    }

    /**
    * Create a Vec3
    * @param {number} x x component of vector
    * @param {number} y y component of vector
    * @param {number} z z component of vector
    * @return {Vec3} vector with given x, y, and z components
    * @see {@link Vec3}, {@link vec3}
    **/
    constructor(x,y,z) {
        if (typeof x == "number" && typeof y == "number" && typeof z == "number"){
            this.x = x;
            this.y = y;
            this.z = z;
        } else {
            throw new Error("All constructor inputs must be numbers");
        }
    }

    /**
     * A vector pointing up
     */
    static get up(){ return new Vec3(0,1,0); }

    /**
     * A vector pointing down
     */
    static get down(){ return new Vec3(0,-1,0); }

    /**
     * A vector pointing north
     */
    static get north(){ return new Vec3(0,0,-1); }

    /**
     * A vector pointing south
     */
    static get south(){ return new Vec3(0,0,1); }

    /**
     * A vector pointing east
     */
    static get east(){ return new Vec3(1,0,0); }

    /**
     * A vector pointing west
     */
    static get west(){ return new Vec3(-1,0,0); }

    /**
     * A list of all directions in 3d
     */
    static get directions(){
        return [
            Vec3.up,
            Vec3.down,
            Vec3.north,
            Vec3.south,
            Vec3.east,
            Vec3.west
        ];
    }
    
    /**
    * Converts this vector to a string
    * @return {Vec3} This vector in the form "this.x this.y this.z"
    * @see {@link toObject}
    **/
    toString(){
        return this.x + " " + this.y + " " + this.z;
    }

    /**
    * Converts this vector to javascript object
    * @return {Vec3} This vector in the form {x:this.x, y:this.y, z:this.z}
    * @see {@link toString}
    **/
    toObject(){
        return {x:this.x, y:this.y, z:this.z};
    }

    /**
    * Determines whether this vector equals another vector
    * @return {bool} Whether this vector equals another vector
    **/
    equals(other){
        return this.x == other.x && this.y == other.y && this.z == other.z;
    }


    /**
    * Adds to this vector
    * @param {number|Vec3} a Number or vector to add to this vector
    * @return {Vec3} The sum
    * @see {@link subtract}
    **/
    add(a){
        if (typeof a == "number"){
            return vec3(this.x + a, this.y + a, this.z + a);
        } else if (a instanceof Vec3){
            return vec3(this.x + a.x, this.y + a.y, this.z + a.z);
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * Subtracts from this vector
    * @param {number|Vec3} a Number or vector to subtract from this vector
    * @return {Vec3} The difference
    * @see {@link add}
    **/
    subtract(a){
        if (typeof a == "number"){
            return vec3(this.x - a, this.y - a, this.z - a);
        } else if (a instanceof Vec3){
            return vec3(this.x - a.x, this.y - a.y, this.z - a.z);
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * Multiplies this vector
    * @param {number|Vec3} a Number or vector to multiply this vector by
    * @return {Vec3} The product
    * @see {@link divide}
    **/
    multiply(a){
        if (typeof a == "number"){
            return vec3(this.x * a, this.y * a, this.z * a);
        } else if (a instanceof Vec3){
            return vec3(this.x * a.x, this.y * a.y, this.z * a.z);
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * Divides this vector
    * @param {number|Vec3} a Number or vector to divide this vector by
    * @return {Vec3} The quotient
    * @see {@link multiply}, {@link mod}
    **/
    divide(a){
        if (typeof a == "number"){
            return vec3(this.x / a, this.y / a, this.z / a);
        } else if (a instanceof Vec3){
            return vec3(this.x / a.x, this.y / a.y, this.z / a.z);
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * The modulo of a vector and a number or a vector and a vector
    * @param {number | Vec3} a Other number or vector to take modulo with
    * @return {Vec3} The modulo of this vector and a
    * @see {@link divide}
    **/
    mod(a){
        if (a instanceof Vec3){
            return vec3(Math.mod(this.x,a.x), Math.mod(this.y,a.y), Math.mod(this.z,a.z));
        } else if (typeof a == "number"){
            return vec3(Math.mod(this.x,a), Math.mod(this.y,a), Math.mod(this.z,a));
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * The sine of this vector
    * @return {Vec3} The sine
    * @see {@link asin}, {@link cos}, {@link tan}
    **/
    sin(){
        return vec3(Math.sin(this.x), Math.sin(this.y), Math.sin(this.z));
    }

    /**
    * The cosine of this vector
    * @return {Vec3} The cosine
    * @see {@link acos}, {@link sin}, {@link tan}
    **/
    cos(){
        return vec3(Math.cos(this.x), Math.cos(this.y), Math.cos(this.z));
    }

    /**
    * The tangent of this vector
    * @return {Vec3} The tangent
    * @see {@link atan}, {@link sin}, {@link cos}
    **/
    tan(){
        return vec3(Math.tan(this.x), Math.tan(this.y), Math.tan(this.z));
    }

    /**
    * The arcsine of this vector
    * @return {Vec3} The arcsine
    * @see {@link sin}, {@link asin}, {@link acos}, {@link atan}
    **/
    asin(){
        return vec3(Math.asin(this.x), Math.asin(this.y), Math.asin(this.z));
    }

    /**
    * The arccosine of this vector
    * @return {Vec3} The arccosine
    * @see {@link cos}, {@link asin}, {@link acos}, {@link atan}
    **/
    acos(){
        return vec3(Math.acos(this.x), Math.acos(this.y), Math.acos(this.z));
    }

    /**
    * The arctangent of this vector
    * @return {Vec3} The arctangent
    * @see {@link tan}, {@link asin}, {@link acos}, {@link atan}
    **/
    atan(){
        return vec3(Math.atan(this.x), Math.atan(this.y), Math.atan(this.z));
    }

    /**
    * This vector raised to a power
    * @param {number} p Power to raise vector to
    * @return {Vec3} This vector raised to p
    * @see {@link sqrt}, {@link exp}
    **/
    pow(p){
        if (typeof p == "number"){
            return vec3(Math.pow(this.x,p), Math.pow(this.y,p), Math.pow(this.z,p));
        } else {
            throw new Error("Power must be a number");
        }
    }

    /**
    * The square root of this vector
    * @return {Vec3} The squart root of this vector
    * @see {@link pow}, {@link cbrt}
    **/
    sqrt(){
        if (this.x >= 0 && this.y >= 0 && this.z >= 0){
            return vec3(Math.sqrt(this.x), Math.sqrt(this.y), Math.sqrt(this.z));
        } else {
            throw new Error("Cannot take the square root of a negative number");
        }
    }

    /**
    * The cube root of this vector
    * @return {Vec3} The cube root of this vector
    * @see {@link pow}, {@link sqrt}
    **/
    cbrt(){
        return vec3(Math.cbrt(this.x), Math.cbrt(this.y), Math.cbrt(this.z));
    }

    /**
    * x raised to this vector
    * @param {number} x Base of the exponentiation
    * @return {Vec3} a raised to this vector
    * @see {@link pow}, {@link log}
    **/
    exp(x){
        if (typeof x == "number"){
            return vec3(Math.pow(x,this.x), Math.pow(x,this.y), Math.pow(x,this.z));
        } else {
            throw new Error("Base must be a number");
        }
    }

    /**
    * The natural logarithm (base e) of this vector
    * @return {Vec3} The natural logarithm (base e) of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log10}
    **/
    log(){
        return vec3(Math.log(this.x), Math.log(this.y), Math.log(this.z));
    }

    /**
    * The base 2 logarithm of this vector
    * @return {Vec3} The base 2 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log}, {@link log10}
    **/
    log2(){
        return vec3(Math.log2(this.x), Math.log2(this.y), Math.log2(this.z));
    }

    /**
    * The base 10 logarithm of this vector
    * @return {Vec3} The base 10 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log}
    **/
    log10(){
        return vec3(Math.log10(this.x), Math.log10(this.y), Math.log10(this.z));
    }

    /**
    * The minumum of a vector and a number or a vector and a vector
    * @param {number | Vec3} a Other number or vector to take min with
    * @return {Vec3} The minimun of this vector and a
    * @see {@link max}, {@link clamp}
    **/
    min(a){
        if (a instanceof Vec3){
            return vec3(Math.min(this.x,a.x), Math.min(this.y,a.y), Math.min(this.z,a.z));
        } else if (typeof a == "number"){
            return vec3(Math.min(this.x,a), Math.min(this.y,a), Math.min(this.z,a));
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * The maximum of a vector and a number or a vector and a vector
    * @param {number | Vec3} a Other number or vector to take max with
    * @return {Vec3} The maximum of this vector and a
    * @see {@link min}, {@link clamp}
    **/
    max(a){
        if (a instanceof Vec3){
            return vec3(Math.max(this.x,a.x), Math.max(this.y,a.y), Math.max(this.z,a.z));
        } else if (typeof a == "number"){
            return vec3(Math.max(this.x,a), Math.max(this.y,a), Math.max(this.z,a));
        } else {
            throw new Error("Input must be number or Vec3");
        }
    }

    /**
    * Clamps the value of the vector to between a and b
    * @param {number | Vec3} low Low end to clamp to
    * @param {number | Vec3} high High end to clamp to
    * @return {Vec3} This vector clamped to between a and b
    * @see {@link min}, {@link max}
    **/
    clamp(low,high){
        if ((low instanceof Vec3 || typeof low == "number") && (high instanceof Vec3 || typeof high == "number")){
            return this.max(this.min(high),low);
        } else {
            throw new Error("Both inputs must be numbers or Vec3s");
        }
    }

    /**
    * Rounds this vector to the nearest 1
    * @return {Vec3} This vector rounded
    * @see {@link floor}, {@link ceil}
    **/
    round(){
        return vec3(Math.round(this.x), Math.round(this.y), Math.round(this.z));
    }

    /**
    * Floors this vector
    * @return {Vec3} The floor of this vector
    * @see {@link round}, {@link ceil}, {@link fract}
    **/
    floor(){
        return vec3(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z));
    }

    /**
    * Ceils this vector
    * @return {Vec3} The ceils of this vector
    * @see {@link floor}, {@link round}
    **/
    ceil(){
        return vec3(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z));
    }

    /**
    * The fractional part of this vector (same as truncate)
    * @return {Vec3} The fractional part of this vector
    * @see {@link floor}
    **/
    fract(){
        return vec3(Math.trunc(this.x), Math.trunc(this.y), Math.trunc(this.z));
    }

    /**
    * The sign of this vector
    * @return {Vec3} The sign of this vector
    * @see {@link abs}
    **/
    sign(){
        return vec3(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z));
    }

    /**
    * The absolute value of this vector
    * @return {Vec3} The absoulute value of this vector
    * @see {@link sign}
    **/
    abs(){
        return vec3(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z));
    }

    /**
    * Mixes this vector with another vector based on the interpolant
    * @param {number | Vec3} a Other number or vector to take mix with
    * @param {number | Vec3} x Interpolant number or vector
    * @return {Vec3} The new mixed vector
    * @see {@link smoothstep}
    **/
    mix(a, x){
        if (a instanceof Vec3){
            if (x instanceof Vec3){
                return vec3(Math.lerp(this.x,a.x,x.x), Math.lerp(this.y,a.y,x.y), Math.lerp(this.z,a.z,x.z));
            } else if (typeof x == "number"){
                return vec3(Math.lerp(this.x,a.x,x), Math.lerp(this.y,a.y,x), Math.lerp(this.z,a.z,x));
            } else {
                throw new Error("b must be number or Vec3");
            }
        } else if (typeof a == "number"){
            if (x instanceof Vec3){
                return vec3(Math.lerp(this.x,a,x.x), Math.lerp(this.y,a,x.y), Math.lerp(this.z,a,x.z));
            } else if (typeof x == "number"){
                return vec3(Math.lerp(this.x,a,x), Math.lerp(this.y,a,x), Math.lerp(this.z,a,x));
            } else {
                throw new Error("b must be number or Vec3");
            }
        } else {
            throw new Error("a must be number or Vec3");
        }
    }

    /**
    * Gets a component of the vector from a string
    * @param {string} str A string that is one of "x", "y", "z", "r", "g", "b"
    * @return {Vec3} The requested component
    * @see {@link swizzle}
    **/
    getComponent(str){
        if (str instanceof String){
            if (str.length == 1){
                if (str == "x"){
                    return this.x
                }
                if (str == "y"){
                    return this.y
                }
                if (str == "z"){
                    return this.z
                }
                if (str == "r"){
                    return this.r
                }
                if (str == "g"){
                    return this.g
                }
                if (str == "b"){
                    return this.b
                }
                throw new Error("\"" + str + "\" component not found");
            } else {
                throw new Error("Input must be length 1");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Recombines the specified components to form a new vector (see https://en.wikipedia.org/wiki/Swizzling_(computer_graphics))
    * @param {string} str A string that specifies the pattern for the new vector. eg: "xyy", "gx", or "xrxy"
    * @return {Vec3} A new vector with components from the original vector in their specified order
    * @see {@link getComponent}
    **/
    swizzle(str){ 
        if (str instanceof String){
            if (str.length == 2){
                return vec2(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2))
                );
            } else if (str.length == 3){
                return vec3(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3))
                );
            } else if (str.length == 4){
                return vec4(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3)),
                    this.getComponent(str.substring(3,4))
                );
            } else {
                throw new Error("Input must be 2, 3, or 4 characters long");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Returns the dot product of this vector and another vector
    * @param {Vec3} vector Vector to take the dot product of this vector with
    * @return {number} The dot product of the two vectors
    * @see {@link cross}
    **/
    dot(vector){
        if (a instanceof Vec3){
            return this.x*vector.x + this.y*vector.y + this.z*vector.z;
        } else {
            throw new Error("Input must be Vec3");
        }
    }

    /**
    * Returns the cross product of this vector and another vector
    * @param {Vec3} vector Vector to take the cross product of this vector with
    * @return {Vec3} The cross product of the two vectors
    * @see {@link dot}
    **/
    cross(vector){
        if (a instanceof Vec3){
            return vec3(
                this.y*vector.z - this.z*vector.y,
                this.z*vector.x - this.x*vector.z,
                this.x*vector.y - this.y*vector.x
            );
        } else {
            throw new Error("Input must be Vec3");
        }
    }

    /**
    * Reflects the vector over a normal
    * @param {Vec3} normal Normal to reflect this vector about
    * @return {Vec3} This vector flipped over the normal
    * @see {@link normalized}
    **/
    reflect(normal){
        if (normal instanceof Vec3){
            return this.subtract(normal.multiply(this.dot(normal)*2));
        } else {
            throw new Error("Normal must be Vec3");
        }
    }

    /**
    * Gets the length squared of this vector
    * @return {number} The length squared of this vector
    * @see {@link length}, {@link normalized}
    **/
    get lengthSquared(){
        return this.x*this.x + this.y*this.y + this.z*this.z;
    }

    /**
    * Gets the length of this vector
    * @return {number} The length of this vector
    * @see {@link lengthSquared}, {@link normalized}
    **/
    get length(){
        return Math.sqrt(this.lengthSquared);
    }

    /**
    * Gets a vector pointing in the same direction of this vector but with a length of one
    * @return {Vec3} The unit vector facing the same direction as this vector
    * @see {@link length}, {@link lengthSquared}
    **/
    get normalized(){
        let len = this.length;
        if (ls == 0.0){
            console.warn("Vector length is 0, returning 0 vector");
            return vec3(0);
        } else {
            return this.divide(len);
        }
    }
}
//#endregion

//#region vec4
/**
* Creates a Vec4
*
* Input options:
*
* Vec4 vec4() - returns zero vector
*
* Vec4 vec4(number a) - returns vector [a,a,a,a]
*
* Vec4 vec4(vector-like a) - returns vector [a.x,a.z,a.y,a.w]
*
* Vec4 vec4(Vec2 a, Vec2 b) - returns vector [a.x,a.y,b.x,b.y]
*
* Vec4 vec4(Vec3 a, number b) - returns vector [a.x,a.y,a.z,b]
*
* Vec4 vec4(number a, Vec3 b) - returns vector [a,b.x,b.y,b.z]
*
* Vec4 vec4(number a, number b, Vec2 c) - returns vector [a,b,c.x,c.y]
*
* Vec4 vec4(number a, Vec2 b, number c) - returns vector [a,b.x,b.y,c]
*
* Vec4 vec4(Vec2 a, number b, number c) - returns vector [a.x,a.y,b,c]
*
* Vec4 vec4(number a, number b, number c, number d) - returns vector [a,b,c,d]
*
* @see {@link Vec4}
**/
function vec4(a,b,c,d){
    if (a === undefined) { //no paramters
        return new Vec4(0,0,0,0);
    } else if (b === undefined) { //one parameter
        if (typeof a == "number") { //single number input
            return new Vec4(a,a,a,a);
        } else { //vector-like input
            if (a.x && a.y && a.z && a.w){
                return new Vec4(a.x,a.y,a.z,a.w);
            } else {
                throw new Error("x, y, z, and/or w components not found in input object");
            }
        }
    } else if (c === undefined) { //two paramters
        if (a instanceof Vec2 && b instanceof Vec2){
            return new Vec4(a.x, a.y, b.x, b.y);
        } else if (typeof a == "number" && b instanceof Vec3){
            return new Vec4(a, b.x, b.y, b.z);
        } else if (typeof b == "number" && a instanceof Vec3){
            return new Vec3(a.x, a.y, a.z, b);
        }
        throw new Error("Two parameter constructor input must be a number and a Vec3 or a Vec2 and a Vec2");
    } else if (d === undefined) { //three paramters
        if (typeof a == "number" && typeof b == "number" && c instanceof Vec2){
            return new Vec4(a, b, c.x, c.y);
        }
        if (typeof a == "number" && b instanceof Vec2 && typeof c == "number"){
            return new Vec4(a, b.x, b.y, c);
        }
        if (a instanceof Vec2 && typeof b == "number" && typeof c == "number"){
            return new Vec4(a.x, a.y, b, c);
        }
        throw new Error("Three parameter constructor input must be a number a number and a Vec2");
    } else { //four parameters
        if (typeof a == "number" && typeof b == "number" && typeof c == "number" && typeof d == "number"){
            return new Vec4(a,b,c,d);
        }
        throw new Error("four parameter constructor inputs must all be a numbers");
    }
}

/**
* A 4 dimensional vector with components xyzw or rgba
**/
class Vec4 {
    /**
    * x component of vector
    * @see {@link Vec4}
    **/
    x = 0;
    /**
    * y component of vector
    * @see {@link Vec4}
    **/
    y = 0;
    /**
    * z component of vector
    * @see {@link Vec4}
    **/
    z = 0;
    /**
    * w component of vector
    * @see {@link Vec4}
    **/
    w = 0;

    /**
    * r (red) or x component of vector
    * @see {@link Vec4}
    **/
    get r(){
        return this.x
    }
    
    /**
    * g (green) or y component of vector
    * @see {@link Vec4}
    **/
    get g(){
        return this.y
    }

    /**
    * b (blue) or z component of vector
    * @see {@link Vec4}
    **/
    get b(){
        return this.z
    }

    /**
    * a (alpha) or w component of vector
    * @see {@link Vec4}
    **/
    get a(){
        return this.w
    }

    /**
    * Create a Vec3
    * @param {number} x x component of vector
    * @param {number} y y component of vector
    * @param {number} z z component of vector
    * @param {number} w z component of vector
    * @return {Vec3} Vector with given x, y, z, and w components
    * @see {@link Vec4}, {@link vec4}
    **/
    constructor(x,y,z,w) {
        if (typeof x == "number" && typeof y == "number" && typeof z == "number" && typeof w == "number"){
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
        } else {
            throw new Error("All constructor inputs must be numbers");
        }
    }
    
    /**
    * Converts this vector to a string
    * @return {Vec4} This vector in the form "this.x this.y this.z this.w"
    * @see {@link toObject}
    **/
    toString(){
        return this.x + " " + this.y + " " + this.z + " " + this.w;
    }

    /**
    * Converts this vector to javascript object
    * @return {Vec4} This vector in the form {x:this.x, y:this.y, z:this.z, w:this.w}
    * @see {@link toString}
    **/
    toObject(){
        return {x:this.x, y:this.y, z:this.z, w:this.w};
    }

    /**
    * Adds to this vector
    * @param {number|Vec4} a Number or vector to add to this vector
    * @return {Vec4} The sum
    * @see {@link subtract}
    **/
    add(a){
        if (typeof a == "number"){
            return vec3(this.x + a, this.y + a, this.z + a, this.w + a);
        } else if (a instanceof Vec4){
            return vec3(this.x + a.x, this.y + a.y, this.z + a.z, this.w + a.w);
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * Subtracts from this vector
    * @param {number|Vec4} a Number or vector to subtract from this vector
    * @return {Vec4} The difference
    * @see {@link add}
    **/
    subtract(a){
        if (typeof a == "number"){
            return vec3(this.x - a, this.y - a, this.z - a, this.w - a);
        } else if (a instanceof Vec4){
            return vec3(this.x - a.x, this.y - a.y, this.z - a.z, this.w - a.w);
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * Multiplies this vector
    * @param {number|Vec4} a Number or vector to multiply this vector by
    * @return {Vec4} The product
    * @see {@link divide}
    **/
    multiply(a){
        if (typeof a == "number"){
            return vec3(this.x * a, this.y * a, this.z * a, this.w * a);
        } else if (a instanceof Vec4){
            return vec3(this.x * a.x, this.y * a.y, this.z * a.z, this.w * a.w);
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * Divides this vector
    * @param {number|Vec4} a Number or vector to divide this vector by
    * @return {Vec4} The quotient
    * @see {@link multiply}, {@link mod}
    **/
    divide(a){
        if (typeof a == "number"){
            return vec3(this.x / a, this.y / a, this.z / a, this.w / a);
        } else if (a instanceof Vec4){
            return vec3(this.x / a.x, this.y / a.y, this.z / a.z, this.w / a.w);
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * The modulo of a vector and a number or a vector and a vector
    * @param {number | Vec4} a Other number or vector to take modulo with
    * @return {Vec4} The modulo of this vector and a
    * @see {@link divide}
    **/
    mod(a){
        if (a instanceof Vec4){
            return vec4(Math.mod(this.x,a.x), Math.mod(this.y,a.y), Math.mod(this.z,a.z), Math.mod(this.w,a.w));
        } else if (typeof a == "number"){
            return vec4(Math.mod(this.x,a), Math.mod(this.y,a), Math.mod(this.z,a), Math.mod(this.w,a));
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * The sine of this vector
    * @return {Vec4} The sine
    * @see {@link asin}, {@link cos}, {@link tan}
    **/
    sin(){
        return vec4(Math.sin(this.x), Math.sin(this.y), Math.sin(this.z), Math.sin(this.w));
    }

    /**
    * The cosine of this vector
    * @return {Vec4} The cosine
    * @see {@link acos}, {@link sin}, {@link tan}
    **/
    cos(){
        return vec4(Math.cos(this.x), Math.cos(this.y), Math.cos(this.z), Math.cos(this.w));
    }

    /**
    * The tangent of this vector
    * @return {Vec4} The tangent
    * @see {@link atan}, {@link sin}, {@link cos}
    **/
    tan(){
        return vec4(Math.tan(this.x), Math.tan(this.y), Math.tan(this.z), Math.tan(this.w));
    }

    /**
    * The arcsine of this vector
    * @return {Vec4} The arcsine
    * @see {@link sin}, {@link asin}, {@link acos}, {@link atan}
    **/
    asin(){
        return vec4(Math.asin(this.x), Math.asin(this.y), Math.asin(this.z), Math.asin(this.w));
    }

    /**
    * The arccosine of this vector
    * @return {Vec4} The arccosine
    * @see {@link cos}, {@link asin}, {@link acos}, {@link atan}
    **/
    acos(){
        return vec4(Math.acos(this.x), Math.acos(this.y), Math.acos(this.z), Math.acos(this.w));
    }

    /**
    * The arctangent of this vector
    * @return {Vec4} The arctangent
    * @see {@link tan}, {@link asin}, {@link acos}, {@link atan}
    **/
    atan(){
        return vec4(Math.atan(this.x), Math.atan(this.y), Math.atan(this.z), Math.atan(this.w));
    }

    /**
    * This vector raised to a power
    * @param {number} p Power to raise vector to
    * @return {Vec4} This vector raised to p
    * @see {@link sqrt}, {@link exp}
    **/
    pow(p){
        if (typeof p == "number"){
            return vec4(Math.pow(this.x,p), Math.pow(this.y,p), Math.pow(this.z,p), Math.pow(this.z,p));
        } else {
            throw new Error("Power must be a number");
        }
    }

    /**
    * The square root of this vector
    * @return {Vec4} The squart root of this vector
    * @see {@link pow}, {@link cbrt}
    **/
    sqrt(){
        if (this.x >= 0 && this.y >= 0 && this.z >= 0 && this.w >= 0){
            return vec4(Math.sqrt(this.x), Math.sqrt(this.y), Math.sqrt(this.z), Math.sqrt(this.w));
        } else {
            throw new Error("Cannot take the square root of a negative number");
        }
    }

    /**
    * The cube root of this vector
    * @return {Vec4} The cube root of this vector
    * @see {@link pow}, {@link sqrt}
    **/
    cbrt(){
        return vec4(Math.cbrt(this.x), Math.cbrt(this.y), Math.cbrt(this.z), Math.cbrt(this.w));
    }

    /**
    * x raised to this vector
    * @param {number} x Base of the exponentiation
    * @return {Vec4} a raised to this vector
    * @see {@link pow}, {@link log}
    **/
    exp(x){
        if (typeof x == "number"){
            return vec4(Math.pow(x,this.x), Math.pow(x,this.y), Math.pow(x,this.z), Math.pow(x,this.w));
        } else {
            throw new Error("Base must be a number");
        }
    }

    /**
    * The natural logarithm (base e) of this vector
    * @return {Vec4} The natural logarithm (base e) of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log10}
    **/
    log(){
        return vec4(Math.log(this.x), Math.log(this.y), Math.log(this.z), Math.log(this.w));
    }

    /**
    * The base 2 logarithm of this vector
    * @return {Vec4} The base 2 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log}, {@link log10}
    **/
    log2(){
        return vec4(Math.log2(this.x), Math.log2(this.y), Math.log2(this.z), Math.log2(this.w));
    }

    /**
    * The base 10 logarithm of this vector
    * @return {Vec4} The base 10 logarithm of this vector
    * @see {@link exp}, {@link pow}, {@link log2}, {@link log}
    **/
    log10(){
        return vec4(Math.log10(this.x), Math.log10(this.y), Math.log10(this.z), Math.log10(this.w));
    }

    /**
    * The minumum of a vector and a number or a vector and a vector
    * @param {number | Vec4} a Other number or vector to take min with
    * @return {Vec4} The minimun of this vector and a
    * @see {@link max}, {@link clamp}
    **/
    min(a){
        if (a instanceof Vec4){
            return vec4(Math.min(this.x,a.x), Math.min(this.y,a.y), Math.min(this.z,a.z), Math.min(this.w,a.w));
        } else if (typeof a == "number"){
            return vec4(Math.min(this.x,a), Math.min(this.y,a), Math.min(this.z,a), Math.min(this.w,a));
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * The maximum of a vector and a number or a vector and a vector
    * @param {number | Vec4} a Other number or vector to take max with
    * @return {Vec4} The maximum of this vector and a
    * @see {@link min}, {@link clamp}
    **/
    max(a){
        if (a instanceof Vec4){
            return vec3(Math.max(this.x,a.x), Math.max(this.y,a.y), Math.max(this.z,a.z), Math.max(this.w,a.w));
        } else if (typeof a == "number"){
            return vec3(Math.max(this.x,a), Math.max(this.y,a), Math.max(this.z,a), Math.max(this.w,a));
        } else {
            throw new Error("Input must be number or Vec4");
        }
    }

    /**
    * Clamps the value of the vector to between a and b
    * @param {number | Vec4} low Low end to clamp to
    * @param {number | Vec4} high High end to clamp to
    * @return {Vec4} This vector clamped to between a and b
    * @see {@link min}, {@link max}
    **/
    clamp(low,high){
        if ((low instanceof Vec4 || typeof low == "number") && (high instanceof Vec4 || typeof high == "number")){
            return this.max(this.min(high),low);
        } else {
            throw new Error("Both inputs must be numbers or Vec4s");
        }
    }

    /**
    * Rounds this vector to the nearest 1
    * @return {Vec4} This vector rounded
    * @see {@link floor}, {@link ceil}
    **/
    round(){
        return vec4(Math.round(this.x), Math.round(this.y), Math.round(this.z), Math.round(this.w));
    }

    /**
    * Floors this vector
    * @return {Vec4} The floor of this vector
    * @see {@link round}, {@link ceil}, {@link fract}
    **/
    floor(){
        return vec4(Math.floor(this.x), Math.floor(this.y), Math.floor(this.z), Math.floor(this.w));
    }

    /**
    * Ceils this vector
    * @return {Vec4} The ceils of this vector
    * @see {@link floor}, {@link round}
    **/
    ceil(){
        return vec4(Math.ceil(this.x), Math.ceil(this.y), Math.ceil(this.z), Math.ceil(this.w));
    }

    /**
    * The fractional part of this vector (same as truncate)
    * @return {Vec4} The fractional part of this vector
    * @see {@link floor}
    **/
    fract(){
        return vec4(Math.trunc(this.x), Math.trunc(this.y), Math.trunc(this.z), Math.trunc(this.w));
    }

    /**
    * The sign of this vector
    * @return {Vec4} The sign of this vector
    * @see {@link abs}
    **/
    sign(){
        return vec4(Math.sign(this.x), Math.sign(this.y), Math.sign(this.z), Math.sign(this.w));
    }

    /**
    * The absolute value of this vector
    * @return {Vec4} The absoulute value of this vector
    * @see {@link sign}
    **/
    abs(){
        return vec4(Math.abs(this.x), Math.abs(this.y), Math.abs(this.z), Math.abs(this.w));
    }

    /**
    * Mixes this vector with another vector based on the interpolant
    * @param {number | Vec4} a Other number or vector to take mix with
    * @param {number | Vec4} x Interpolant number or vector
    * @return {Vec4} The new mixed vector
    * @see {@link smoothstep}
    **/
    mix(a, x){
        if (a instanceof Vec4){
            if (x instanceof Vec4){
                return vec4(Math.lerp(this.x,a.x,x.x), Math.lerp(this.y,a.y,x.y), Math.lerp(this.z,a.z,x.z), Math.lerp(this.w,a.w,x.w));
            } else if (typeof x == "number"){
                return vec4(Math.lerp(this.x,a.x,x), Math.lerp(this.y,a.y,x), Math.lerp(this.z,a.z,x), Math.lerp(this.w,a.w,x));
            } else {
                throw new Error("b must be number or Vec4");
            }
        } else if (typeof a == "number"){
            if (x instanceof Vec3){
                return vec4(Math.lerp(this.x,a,x.x), Math.lerp(this.y,a,x.y), Math.lerp(this.z,a,x.z), Math.lerp(this.w,a,x.w));
            } else if (typeof x == "number"){
                return vec4(Math.lerp(this.x,a,x), Math.lerp(this.y,a,x), Math.lerp(this.z,a,x), Math.lerp(this.w,a,x));
            } else {
                throw new Error("b must be number or Vec4");
            }
        } else {
            throw new Error("a must be number or Vec4");
        }
    }

    /**
    * Gets a component of the vector from a string
    * @param {string} str A string that is one of "x", "y", "z", "r", "g", "b"
    * @return {Vec4} The requested component
    * @see {@link swizzle}
    **/
    getComponent(str){
        if (str instanceof String){
            if (str.length == 1){
                if (str == "x"){
                    return this.x
                }
                if (str == "y"){
                    return this.y
                }
                if (str == "z"){
                    return this.z
                }
                if (str == "w"){
                    return this.w
                }
                if (str == "r"){
                    return this.r
                }
                if (str == "g"){
                    return this.g
                }
                if (str == "b"){
                    return this.b
                }
                if (str == "a"){
                    return this.a
                }
                throw new Error("\"" + str + "\" component not found");
            } else {
                throw new Error("Input must be length 1");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Recombines the specified components to form a new vector (see https://en.wikipedia.org/wiki/Swizzling_(computer_graphics))
    * @param {string} str A string that specifies the pattern for the new vector. eg: "xyy", "gx", or "xrxy"
    * @return {Vec2 | Vec3 | Vec4} A new vector with components from the original vector in their specified order
    * @see {@link getComponent}
    **/
    swizzle(str){ 
        if (str instanceof String){
            if (str.length == 2){
                return vec2(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2))
                );
            } else if (str.length == 3){
                return vec3(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3))
                );
            } else if (str.length == 4){
                return vec4(
                    this.getComponent(str.substring(0,1)),
                    this.getComponent(str.substring(1,2)),
                    this.getComponent(str.substring(2,3)),
                    this.getComponent(str.substring(3,4))
                );
            } else {
                throw new Error("Input must be 2, 3, or 4 characters long");
            }
        } else {
            throw new Error("Input must be string");
        }
    }

    /**
    * Returns the dot product of this vector and another vector
    * @param {Vec4} vector Vector to take the dot product of this vector with
    * @return {number} The dot product of the two vectors
    * @see {@link cross}
    **/
    dot(vector){
        if (a instanceof Vec4){
            return this.x*vector.x + this.y*vector.y + this.z*vector.z + this.w*vector.w;
        } else {
            throw new Error("Input must be Vec4");
        }
    }

    /**
    * Reflects the vector over a normal
    * @param {Vec4} normal Normal to reflect this vector about
    * @return {Vec4} This vector flipped over the normal
    * @see {@link normalized}
    **/
    reflect(normal){
        if (normal instanceof Vec4){
            return this.subtract(normal.multiply(this.dot(normal)*2));
        } else {
            throw new Error("Normal must be Vec3");
        }
    }

    /**
    * Gets the length squared of this vector
    * @return {number} The length squared of this vector
    * @see {@link length}, {@link normalized}
    **/
    get lengthSquared(){
        return this.x*this.x + this.y*this.y + this.z*this.z + this.w*this.w;
    }

    /**
    * Gets the length of this vector
    * @return {number} The length of this vector
    * @see {@link lengthSquared}, {@link normalized}
    **/
    get length(){
        return Math.sqrt(this.lengthSquared);
    }

    /**
    * Gets a vector pointing in the same direction of this vector but with a length of one
    * @return {Vec4} The unit vector facing the same direction as this vector
    * @see {@link length}, {@link lengthSquared}
    **/
    get normalized(){
        let len = this.length;
        if (ls == 0.0){
            console.warn("Vector length is 0, returning 0 vector");
            return vec4(0);
        } else {
            return this.divide(len);
        }
    }
}
//#endregion
