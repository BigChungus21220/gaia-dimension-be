import { Dimension, BlockPermutation, Block, world, Entity, BlockVolume } from "@minecraft/server";
import { Vec3 } from "../Vec3";

/**
 * @typedef Link
 * @property {Vec3} location
 * @property {Vec3} linkedLocation
 * @property {Vec3} size
 */

/**
 * @author Refracted
 * @description Class that manages Portal structures and Portal Linking.
 */
class Portal {
    /**
     * @type {Array<Link>}
     * @private
     */
    static linked = JSON.parse(world.getDynamicProperty('PortalLinked') ?? "[]");
    static LinkPositions = ['start', 'end'];
    /** @private */
    static serialize = JSON.stringify;
    static PortalSizeY = 3;
    static PortalSizeZ = 2;

    /**
     * Get adjacent blocks of a specific type within a defined range.
     * @param {Block} block - The reference block.
     * @param {string} typeId - The type ID to match for adjacent blocks.
     * @returns {Array<Block>} An array of adjacent blocks that match the type ID.
     */
    static getAdjacentBlocks(block, typeId) {
        const adjacentBlocks = [];
        const directions = [
            { x: 1, y: 0, z: 0 }, { x: -1, y: 0, z: 0 },
            { x: 0, y: 1, z: 0 }, { x: 0, y: -1, z: 0 },
            { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: -1 }
        ];

        for (const dir of directions) {
            const adjacentPos = Vec3.add(block.location, dir);
            const adjacentBlock = block.dimension.getBlock(adjacentPos);
            if (adjacentBlock && adjacentBlock.typeId === typeId) {
                adjacentBlocks.push(adjacentBlock);
            }
        }

        return adjacentBlocks;
    }

    /**
     * Checks if two locations are already linked.
     * @param {Vec3} fromLocation 
     * @param {Vec3} toLocation 
     * @returns {boolean}
     */
    static isLinked(fromLocation, toLocation) {
        return this.linked.some(link =>
            link.location.x === fromLocation.x &&
            link.location.y === fromLocation.y &&
            link.location.z === fromLocation.z &&
            link.linkedLocation.x === toLocation.x &&
            link.linkedLocation.y === toLocation.y &&
            link.linkedLocation.z === toLocation.z
        );
    }

    /**
     * Link two locations.
     * @param {Vec3} fromLocation - The starting location.
     * @param {Vec3} toLocation - The ending location.
     */
    static link(fromLocation, toLocation) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        if (!this.isLinked(fromLocation, toLocation)) {
            this.linked.push({ location: fromLocation, linkedLocation: toLocation });
            world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
        }
    }

    /**
     * Unlinks a link between two locations.
     * @param {Vec3} fromLocation - The starting location.
     * @param {Vec3} toLocation - The ending location.
     */
    static unlink(fromLocation, toLocation) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        this.linked = this.linked.filter(l =>
            !(l.location.x === fromLocation.x && l.location.y === fromLocation.y && l.location.z === fromLocation.z &&
              l.linkedLocation.x === toLocation.x && l.linkedLocation.y === toLocation.y && l.linkedLocation.z === toLocation.z)
        );
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
    }

    /**
     * Get the linked location from a given location.
     * @param {string} from - 'start' or 'end'.
     * @param {Vec3} location - The location to check.
     * @returns {Link|undefined} The linked object.
     */
    static getLink(from, location) {
        if (typeof location !== 'object') {
            throw new Error('location must be an object');
        }
        return this.findLink(from, location);
    }

    /**
     * Check if an entity is within the bounds of a linked portal.
     * @param {string} from - 'start' or 'end'.
     * @param {Entity} entity - The entity to check.
     * @returns {Link|undefined} The link if the entity is within a portal.
     */
    static isEntityInLinked(from, entity) {
        if (typeof entity !== 'object') {
            throw new Error('entity must be an object');
        }
        return this.findLink(from, entity.location);
    }

    /**
     * Find the link based on the origin and the given location.
     * @param {string} from - The origin ('start' or 'end').
     * @param {Vec3} location - The location to check.
     * @returns {Link|undefined} The found link or undefined.
     */
    static findLink(from, location) {
        let link;
        switch (from) {
            case 'start':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.location, {
                        x: link.location.x,
                        y: link.location.y + this.PortalSizeY,
                        z: link.location.z + this.PortalSizeZ
                    });
                    return volume.isInside(location);
                });
                break;
            case 'end':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.linkedLocation, {
                        x: link.linkedLocation.x,
                        y: link.linkedLocation.y + this.PortalSizeY,
                        z: link.linkedLocation.z + this.PortalSizeZ
                    });
                    return volume.isInside(location);
                });
                break;
            default:
                throw new Error(`Invalid value for 'from': ${from}`);
        }
        return link || undefined;
    }

    /**
     * Creates the portal structure by setting keystone blocks on the edges and portal blocks in the center.
     * @param {Vec3} corner - The corner position of the portal.
     * @param {Dimension} dimension - The dimension where the portal is.
     * @param {boolean} x_oriented - Whether the portal is oriented along the x-axis.
     */
    static lightPortal(corner, dimension, x_oriented) {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                const is_edge = (x === 0 || y === 0 || x === 3 || y === 4);
                const pos = Vec3.add(corner, { x: x_oriented ? 0 : x, y: y, z: x_oriented ? x : 0 });
                const block = dimension.getBlock(pos);
                if (block !== undefined) {
                    if (is_edge) {
                        block.setType('gaia:keystone_block');
                    } else {
                        block.setPermutation(BlockPermutation.resolve("gaia:gaia_portal", { "gaia:x_oriented": x_oriented }));
                    }
                }
            }
        }
    }

    /**
     * Breaks a portal by unlinking it and setting adjacent portal blocks to air.
     * @param {Block} block - A block that is part of the portal.
     */
    static breakPortal(block) {
        const adjacent = this.getAdjacentBlocks(block, 'gaia:gaia_portal');
        adjacent.forEach(b => {
            this.LinkPositions.forEach(position => {
                const link = this.getLink(position, b.location); // use the adjacent block's location
                if (link) {
                    this.unlink(link.location, link.linkedLocation);
                }
            });
            b.setPermutation(BlockPermutation.resolve("minecraft:air"));
        });
    }

    /**
     * Checks if the structure starting at a corner is unlit.
     * @param {Vec3} corner - The starting corner of the portal structure.
     * @param {Dimension} dimension - The dimension.
     * @param {boolean} x_oriented - Orientation flag.
     * @returns {boolean} True if the structure is unlit.
     */
    static isUnlit(corner, dimension, x_oriented) {
        let isValid = true;
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                const blockpos = Vec3.add(corner, { x: x_oriented ? 0 : x, y: y, z: x_oriented ? x : 0 });
                const block = dimension.getBlock(blockpos);
                const blocktype = block ? block.typeId : "";
                const is_edge = (x === 0 || y === 0 || x === 3 || y === 4);
                if (is_edge && blocktype !== "gaia:keystone_block") {
                    isValid = false;
                    break;
                }
                if (!is_edge && blocktype !== "minecraft:air") {
                    isValid = false;
                    break;
                }
            }
            if (!isValid) break;
        }
        return isValid;
    }

    /**
     * Checks whether a portal can be lit and, if so, lights it.
     * Tries the default orientation first; if that fails, attempts the alternative.
     * @param {Block} block - A block from which to attempt lighting the portal.
     * @returns {boolean} Whether lighting the portal was successful.
     */
    static canLight(block) {
        let position = block.location;
        let dimension = block.dimension;
        let offset = Vec3.zero;
        let light_success = false;
        let x_oriented = true;
        // Try with initial orientation:
        for (let x = -2; x <= -1; x++) {
            for (let y = -3; y <= -1; y++) {
                let test_offset = { x: x_oriented ? 0 : x, y: y, z: x_oriented ? x : 0 };
                if (this.isUnlit(Vec3.add(position, test_offset), dimension, x_oriented)) {
                    offset = test_offset;
                    light_success = true;
                    break;
                }
            }
            if (light_success) break;
        }
        // If unsuccessful, try with alternative orientation:
        if (!light_success) {
            x_oriented = false;
            for (let x = -2; x <= -1; x++) {
                for (let y = -3; y <= -1; y++) {
                    let test_offset = { x: x_oriented ? 0 : x, y: y, z: x_oriented ? x : 0 };
                    if (this.isUnlit(Vec3.add(position, test_offset), dimension, x_oriented)) {
                        offset = test_offset;
                        light_success = true;
                        break;
                    }
                }
                if (light_success) break;
            }
        }
        if (light_success) {
            this.lightPortal(Vec3.add(position, offset), dimension, x_oriented);
        }
        return light_success;
    }
}

export default Portal;
