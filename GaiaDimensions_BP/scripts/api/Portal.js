import { BlockPermutation, Block, world, Entity, BlockVolume } from "@minecraft/server"
import { Vec3, vec3 } from "../Vec3";
/**
 * @typedef Link
 * @property {Vec3} location
 * @property {Vec3} linkedLocation
 * @property {Vec3} size
 */

/**
 * @author Redux
 * @description Class that manages Portal structures and Portal Linking.
 */
class Portal {
    /**
     * @type {Array<Link>}
     * @private
     */
    static linked = JSON.parse(world.getDynamicProperty('PortalLinked') ?? "[]");
    static LinkPositions = ['start', 'end']
    /**
     * @private
     */
    static serialize = JSON.stringify;
    static PortalSizeY = 3;
    static PortalSizeZ = 2;

    /**
     * Link two locations.
     * @param {Vec3} fromLocation - The starting location.
     * @param {Vec3} toLocation - The ending location.
     */
    static link(fromLocation, toLocation) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        const data = { location: fromLocation, linkedLocation: toLocation };
        if (!this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation)) {
            this.linked.push(data);
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
        this.linked = this.linked.filter(l => {
            l.location != fromLocation && l.linkedLocation != toLocation
        })
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
    }
    /**
   * Get the linked location from a given location.
   * @param {Vec3} location - The location.
   * @param {string} from - Whether the location is the start or end of the linked location
   * @returns {Link} The linked object.
   */
    static getLink(from, location) {
        if (typeof location !== 'object') {
            throw new Error('location must be an object');
        }
        let link;
        switch (from) {
            case 'start':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.location, { x: link.location.x, y: link.location.y + this.PortalSizeY, z: link.location.z + this.PortalSizeZ });
                    return volume.isInside(location)
                });
                break;
            case 'end':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.linkedLocation, { x: link.linkedLocation.x, y: link.linkedLocation.y + this.PortalSizeY, z: link.linkedLocation.z + this.PortalSizeZ });
                    return volume.isInside(location)
                });
                break;
            default:
                throw new Error(`Invalid value for 'from': ${from}`);
        }
        return link || undefined;
    }

    /**
     * Get all links.
     * @returns {Array<Link>} The array of all links.
     */
    static getAllLinks() {
        return this.linked;
    }

    /**
     * Clear all links.
     */
    static clearAllLinks() {
        this.linked = []
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked))
    }

    /**
     * Check if two locations are linked.
     * @param {Vec3} fromLocation - The starting location.
     * @param {Vec3} toLocation - The ending location.
     * @returns {boolean} True if the locations are linked, false otherwise.
     */
    static isLinked(fromLocation, toLocation) {
        return this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation);
    }

    /**
     * Get the count of links.
     * @returns {number} The count of links.
     */
    static getCount() {
        return this.linked.length
    }

    /**
     * Check if a link exists.
     * @param {Link} link - The link to check.
     * @returns {boolean} True if the link exists, false otherwise.
     */
    static hasLink(link) {
        return this.linked.includes(link)
    }
    /**
     * Check if an entity is within the bounds of a linked portal.
     * @param {Entity} entity - The entity to check.
     * @param {string} from - Whether the entity is at the start or end of the linked location
     * @returns {Link|undefined} The link that the entity is in, or undefined if the entity is not in any linked portal.
     */
    static isEntityInLinked(from, entity) {
        if (typeof entity !== 'object') {
            throw new Error('entity must be an object');
        }
        let link;
        switch (from) {
            case 'start':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.location, { x: link.location.x, y: link.location.y + this.PortalSizeY, z: link.location.z + this.PortalSizeZ });
                    return volume.isInside(entity.locationlocation)
                });
                break;
            case 'end':
                link = this.linked.find(link => {
                    const volume = new BlockVolume(link.linkedLocation, { x: link.linkedLocation.x, y: link.linkedLocation.y + this.PortalSizeY, z: link.linkedLocation.z + this.PortalSizeZ });
                    return volume.isInside(entity.location)
                });
                break;
            default:
                throw new Error(`Invalid value for 'from': ${from}`);
        }
        return link || undefined;
    }

    static async lightPortal(corner, dimension, x_oriented) {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = vec3(corner).add(vec3(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                const block = await new Promise((resolve) => { const block = dimension.getBlock(blockpos); if (block !== undefined) { resolve(block) } })
                if (is_edge) {
                    block.setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
                } else {
                    block.setPermutation(BlockPermutation.resolve("gaia:gaia_portal", { "gaia:x_oriented": x_oriented }))
                }
            }
        }
    }

    static breakPortal(block) {
        const adjacent = block.getAdjacent((block) => block.typeId === 'gaia:gaia_portal', 40);
        adjacent.forEach(b => {
            this.LinkPositions.forEach(position => {
                const link = this.getLink(position, b.location)
                if (link) {
                    this.unlink(link.location, link.linkedLocation)
                } else return;
            });
            b.setPermutation(BlockPermutation.resolve("minecraft:air"));
        })
    }

    static isLit(corner, dimension, x_oriented) {
        let isValid = true
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = vec3(corner).add(vec3(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let blocktype = dimension.getBlock(blockpos).typeId
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                if (is_edge && blocktype != "gaia:keystone_block") {
                    isValid = false
                    break
                }
                if (!is_edge && blocktype != "gaia:gaia_portal") {
                    isValid = false
                    break
                }
            }
        }
        return isValid
    }

    static isUnlit(corner, dimension, x_oriented) {
        let isValid = true
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                let blockpos = vec3(corner).add(vec3(x_oriented ? 0 : x, y, x_oriented ? x : 0));
                let blocktype = dimension.getBlock(blockpos).typeId
                let is_edge = x == 0 || y == 0 || x == 3 || y == 4
                if (is_edge && blocktype != "gaia:keystone_block") {
                    isValid = false
                    break
                }
                if (!is_edge && blocktype != "minecraft:air") {
                    isValid = false
                    break
                }
            }
        }
        return isValid
    }
    /**
     * Checks whether a portal can be lit and if so lights the portal
     * @param {Block} block 
     * @returns {boolean} Whether lighting this portal was a success or not
     */
    static canLight(block) {
        let position = block.location
        let dimension = block.dimension
        let offset = vec3(0, 0, 0)
        let light_success = false
        let x_oriented = true
        for (let x = -2; x <= -1; x++) {
            for (let y = -3; y <= -1; y++) {
                let test_offset = vec3(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (this.isUnlit(vec3(position).add(test_offset), dimension, true)) {
                    offset = test_offset
                    light_success = true
                    break
                }
            }
        }
        if (!light_success) {
            x_oriented = false
            for (let x = -2; x <= -1; x++) {
                for (let y = -3; y <= -1; y++) {
                    let test_offset = vec3(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                    if (this.isUnlit(vec3(position).add(test_offset), dimension, false)) {
                        offset = test_offset
                        light_success = true
                        break
                    }
                }
            }
        }

        if (light_success) {
            this.lightPortal(vec3(position).add(offset), dimension, x_oriented)
        }
        return light_success
    }
}


export default Portal;
