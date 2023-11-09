/*
    Better Vectors by Bigchungus21220

    Provides vector operations and conversions for scripting.

    to use in your script:
        import { vec3 } from 'scripts/Vector.js'; 

    Convert to vector (don't need the new keyword):
        vec3(): zero vector
        vec3(string): enumerated direction (up, down, east, west, north, south) to direction vector
        vec3(number): a vector where all components are the input number
        vec3(object): converts an object {x:, y: z:} to a vector
        vec3(number,number,number): a vector with components x, y, and z

    Convert from vector:
        Vec3.toString(): converts to string in the format x y z
        Vec3.toObject(): converts to object {x: , y: , z: }

    Operations:
        Vec3.add(vector) = adds two vectors
        Vec3.add(number) = adds a number to a vector
        Vec3.subtract(vector) = subtracts a vector from this vector
        Vec3.subtract(number) = subtracts a number from this vector
        Vec3.multiply(vector) = multiplies two vectors
        Vec3.multiply(number) = multiplies a vector by a number
        Vec3.divide(vector) = divides this vector by another vector
        Vec3.divide(number) = divides this vector by a number
        Vec3.dot(vector) = finds the dot product of two vectors
        Vec3.cross(vector) = finds the cross product of two vectors
        Vec3.length = gets the length of a vector
        Vec3.normalized = gets the vector but with a length of one
*/

export { vec3 };
/**
 * 
 * @param {number} a 
 * @param {number} b 
 * @param {number} c 
 * @returns {Vec3}
 */
function vec3(a,b,c){
    if (a === undefined) {
        return new Vec3();
    } else if (b === undefined) {
        let type = typeof a;
        if (type == "string"){
            const lookup = {
                up: vec3(0,1,0),
                down: vec3(0,-1,0),
                east: vec3(1,0,0),
                west: vec3(-1,0,0),
                north: vec3(0,0,-1),
                south: vec3(0,0,1)
            };
            return lookup[a];
        } else if (type == "number") {
            return new Vec3(a,a,a);
        } else {
            return vec3(a.x,a.y,a.z);
        }
    } else {
        return new Vec3(a,b,c);
    }
}

class Vec3 {
    x = 0;
    y = 0;
    z = 0;

    constructor(x,y,z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
    
    toString(){
        return this.x + " " + this.y + " " + this.z;
    }

    toObject(){
        return {x:this.x, y:this.y, z:this.z};
    }

    add(a){
        if (typeof a == "number"){
            return vec3(this.x + a, this.y + a, this.z + a);
        } else {
            return vec3(this.x + a.x, this.y + a.y, this.z + a.z);
        }
    }

    subtract(a){
        if (typeof a == "number"){
            return vec3(this.x - a, this.y - a, this.z - a);
        } else {
            return vec3(this.x - a.x, this.y - a.y, this.z - a.z);
        }
    }

    multiply(a){
        if (typeof a == "number"){
            return vec3(this.x * a, this.y * a, this.z * a);
        } else {
            return vec3(this.x * a.x, this.y * a.y, this.z * a.z);
        }
    }

    divide(a){
        if (typeof a == "number"){
            return vec3(this.x / a, this.y / a, this.z / a);
        } else {
            return vec3(this.x / a.x, this.y / a.y, this.z / a.z);
        }
    }

    dot(vector){
        return this.x*vector.x + this.y*vector.y + this.z*vector.z;
    }

    cross(vector){
        return vec3(
            this.y*vector.z - this.z*vector.y,
            this.z*vector.x - this.x*vector.z,
            this.x*vector.y - this.y*vector.x
        );
    }

    get length(){
        return sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    }

    get lengthSquared(){
        return this.x*this.x + this.y*this.y + this.z*this.z;
    }

    get normalized(){
        return this.divide(this.length);
    }
}
