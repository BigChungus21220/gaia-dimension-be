import { Player, Entity, world } from "@minecraft/server";
import { Vec3, vec3 } from "../Vec3";

export { GaiaDimension };

const the_end = world.getDimension('the_end');


let ALL_DIMENSIONS = {}
/**
 * Class representing a generic GaiaDimension
 */
class GaiaDimension {
    /**
     * Creates an instance of a GaiaDimension
     * @param {Object} options - Options for the dimension
     * @param {string} options.type - ID of the dimension
     * @param {Object} options.range - Range of the dimension
     */
    constructor({ type, range }) {
        this.#type = type;
        this.#range = range;
        this.#center = {
            x: (this.range.start.x + this.range.end.x) / 2,
            z: (this.range.start.z + this.range.end.z) / 2
        };
    }

    #range
    #type
    #center

    /**
     * Gets the type of the dimension
     * @returns {String} The ID of the dimension
     */
    get type() {
        return this.#type + '';
    }

    /**
     * Gets the range of the dimension
     * @returns {Object} The range of the dimension with start and end coordinates
     */
    get range() {
        return {
            start: { x: this.#range.start.x, z: this.#range.start.z },
            end: { x: this.#range.end.x, z: this.#range.end.z }
        };
    }

    /**
     * Gets the center coordinates of the dimension
     * @returns {{x:number,z:number}} The center coordinates of the dimension
     */
    get center() {
        return {
            x: this.#center.x,
            z: this.#center.z
        };
    }

    /**
     * Checks whether a given location is on the dimension
     * @param {Vec3} location - Location to check
     * @returns {Boolean} Whether or not the location is on the dimension
     */
    isInDimension(location) {
        return (
            this.range.start.x <= location.x && location.x <= this.range.end.x &&
            this.range.start.z <= location.z && location.z <= this.range.end.z
        );
    }

    /**
     * Gets all entities in the End that match the EntityQueryOptions
     * @param {EntityQueryOptions} entityQueryOptions - Query to use for search
     * @returns {Entity[]} All entities matching the query
     */
    getEntities(entityQueryOptions = {}) {
        return the_end.getEntities(entityQueryOptions).filter(entity =>
            this.isInDimension(entity.location)
        );
    }

    /**
     * Gets all players on the dimension that match the EntityQueryOptions
     * @param {EntityQueryOptions} entityQueryOptions - Query to use for search
     * @returns {Player[]} All players matching the query
     */
    getPlayers(entityQueryOptions = {}) {
        return the_end.getPlayers(entityQueryOptions).filter(entity =>
            this.isInDimension(entity.location)
        );
    }

    /**
     * Offsets the given location relative to the dimension's center
     * @param {Vec3} location - The location to offset
     * @returns {Vec3} The offset location relative to the dimension's center
     */
    offset(location) {
        return {
            x: location.x - this.center.x,
            y: location.y,
            z: location.z - this.center.z
        };
    }

    /**
     * Registers a new dimension with the given ID and options
     * @param {string} id - The ID of the dimension to register
     * @param {Object} options - Options for the dimension
     * @throws {Error} Throws an error if a dimension with the same ID is already registered
     */
    static register(id, options) {
        if (GaiaDimension.get(id) !== undefined) throw new Error('Dimension with id "' + id + '" is already registered');
        options = {
            range: options.range || { start: { x: -1, z: -1 }, end: { x: 1, z: 1 } },
        };
        ALL_DIMENSIONS[id] = new GaiaDimension({ type: id, range: options.range });
        return GaiaDimension.get(id)
    }

    /**
     * Retrieves a registered dimension by its ID
     * @param {string} id - The ID of the dimension to retrieve
     * @returns {GaiaDimension|undefined} The dimension if found, otherwise undefined
     */
    static get(id) {
        return ALL_DIMENSIONS[id];
    }

    /**
     * Retrieves all registered dimensions
     * @returns {GaiaDimension[]} An array of all registered dimensions
     */
    static getAll() {
        return Object.keys(ALL_DIMENSIONS).map(id => this.get(id));
    }

    static of(entity) {
        if (entity.dimension.id !== "minecraft:the_end") return;
        const loc = entity.location;
        return Object.values(ALL_DIMENSIONS).find(p => p.isInDimension(loc));
    }

    // --- Merged from Gaia.js ---

    /**
     * Range of blocks in the end that Gaia takes up
     */
    static range = { start: { x: 100000, z: 100000 }, end: { x: 400000, z: 400000 } };

    /**
     * Center block of Gaia dimension
     */
    static origin = { x: (this.range.start.x + this.range.end.x) / 2, z: (this.range.start.z + this.range.end.z) / 2 };

    /**
     * Biomes found in Gaia
     */
    static biomes = [
        "mineral_river",
        "volcanic_lands",
        "shining_grove",
        "smoldering_bog",
        "static_wasteland",
        "green_agate_jungle",
        "crystal_plains",
        "goldstone_lands",
        "mutant_agate_wildwood",
        "purple_agate_swamp",
        "blue_agate_taiga",
        "pink_agate_forest",
        "salt_dunes",
        "fossil_woodland",
        "mineral_resevoir"
    ]

    /**
     * Checks whether a given location is in the main Gaia dimension area
     * @param {Vec3} location location to check
     * @returns {boolean} Whether or not the location is in Gaia
     */
    static isInGaia(location) {
        return this.range.start.x <= location.x && location.x <= this.range.end.x && this.range.start.z <= location.z && location.z <= this.range.end.z;
    }

    /**
     * Gets the biome that a given location is in
     * @param {Vec3} location location to check
     * @returns {string|boolean} The biome the location is in (if applicable, otherwise false)
     */
    static getBiome(location) {
        if (this.isInGaia(location)) {
            try {
                const block = this.getBlock(vec3(location.x, 0, location.z)).typeId.replace("gaiadimension:bedrock_", "");
                return block || false;
            } catch (e) {
                return false; // Block is not loaded
            }
        }
        return false;
    }

    /**
     * Returns the block at the given location in the end dimension
     * @param {Vec3} location Location to get block from
     * @returns {Block} The block at the location
     */
    static getBlock(location) {
        return the_end.getBlock(location);
    }
}

/**
 * @typedef {import("@minecraft/server").Vector3} Vec3
 * @typedef {import("@minecraft/server").EntityQueryOptions} EntityQueryOptions
 */
