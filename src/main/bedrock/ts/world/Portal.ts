import { Dimension, BlockPermutation, Block, world, Entity, BlockVolume, Vector3 } from "@minecraft/server";
import { Vec3 } from "../Vec3.js";

export interface Link {
    location: Vector3;
    linkedLocation: Vector3;
}

/**
 * @author Refracted
 * @description Class that manages Portal structures and Portal Linking.
 */
class Portal {
    /**
     * @private
     */
    private static linked: Link[] = JSON.parse(world.getDynamicProperty('PortalLinked') as string ?? "[]");
    static LinkPositions: ('start' | 'end')[] = ['start', 'end'];
    /** @private */
    private static serialize = JSON.stringify;
    static PortalSizeY = 3;
    static PortalSizeZ = 2;

    /**
     * Get adjacent blocks of a specific type within a defined range.
     * @param {Block} block - The reference block.
     * @param {string} typeId - The type ID to match for adjacent blocks.
     * @returns {Array<Block>} An array of adjacent blocks that match the type ID.
     */
    static getAdjacentBlocks(block: Block, typeId: string): Block[] {
        const adjacentBlocks: Block[] = [];
        const directions: Vector3[] = [
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
     * Link two locations.
     * @param {Vector3} fromLocation - The starting location.
     * @param {Vector3} toLocation - The ending location.
     */
    static link(fromLocation: Vector3, toLocation: Vector3): void {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
        if (!this.findLink('start', fromLocation)) {
            this.linked.push({ location: fromLocation, linkedLocation: toLocation });
            world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
        }
    }

    /**
     * Unlinks a link between two locations.
     * @param {Vector3} fromLocation - The starting location.
     * @param {Vector3} toLocation - The ending location.
     */
    static unlink(fromLocation: Vector3, toLocation: Vector3): void {
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
     * @param {string} from - Whether the location is the start or end of the linked location.
     * @param {Vector3} location - The location.
     * @returns {Link|undefined} The linked object.
     */
    static getLink(from: 'start' | 'end', location: Vector3): Link | undefined {
        if (typeof location !== 'object') {
            throw new Error('location must be an object');
        }
        return this.findLink(from, location);
    }

    /**
     * Check if an entity is within the bounds of a linked portal.
     * @param {string} from - Whether the entity is at the start or end of the linked location.
     * @param {Entity} entity - The entity to check.
     * @returns {Link|undefined} The link that the entity is in, or undefined if the entity is not in any linked portal.
     */
    static isEntityInLinked(from: 'start' | 'end', entity: Entity): Link | undefined {
        if (typeof entity !== 'object') {
            throw new Error('entity must be an object');
        }
        return this.findLink(from, entity.location);
    }

    /**
     * Find the link based on the origin and the given location.
     * @param {string} from - The origin ('start' or 'end').
     * @param {Vector3} location - The location to check.
     * @returns {Link|undefined} The found link or undefined.
     */
    static findLink(from: 'start' | 'end', location: Vector3): Link | undefined {
        let link: Link | undefined;
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
        return link;
    }

    static lightPortal(corner: Vector3, dimension: Dimension, x_oriented: boolean): void {
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                const is_edge = x === 0 || y === 0 || x === 3 || y === 4;
                const block = dimension.getBlock(Vec3.add(corner, { x: x_oriented ? 0 : x, y, z: x_oriented ? x : 0 }))
      
                if (block) {
                    if (is_edge) {
                      block.setType('gaiadimension:keystone_block')
                    } else {
                      block.setPermutation(BlockPermutation.resolve("gaiadimension:gaia_dimension_portal", { "gaiadimension:perm_dim": 0 }));
                    }
                }
            }
        }
    }

    static breakPortal(block: Block): void {
        const adjacent = this.getAdjacentBlocks(block, 'gaiadimension:gaia_dimension_portal');
        adjacent.forEach(b => {
            this.LinkPositions.forEach(position => {
                const link = this.getLink(position, block.location);
                if (link) {
                    this.unlink(link.location, link.linkedLocation);
                }
            });
            b.setType("minecraft:air");
        });
    }

    static isUnlit(corner: Vector3, dimension: Dimension, x_oriented: boolean): boolean {
        let isValid = true;
        for (let x = 0; x < 4; x++) {
            for (let y = 0; y < 5; y++) {
                const blockpos = Vec3.add(corner, { x: x_oriented ? 0 : x, y, z: x_oriented ? x : 0 });
                const block = dimension.getBlock(blockpos);
                if (!block) {
                    isValid = false;
                    break;
                }
                const blocktype = block.typeId;
                const is_edge = x === 0 || y === 0 || x === 3 || y === 4;
                if (is_edge && blocktype !== "gaiadimension:keystone_block") {
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
     * Checks whether a portal can be lit and if so lights the portal.
     * @param {Block} block
     * @returns {boolean} Whether lighting this portal was a success or not.
     */
    static canLight(block: Block): boolean {
        const position = block.location;
        const dimension = block.dimension;
        let offset: Vector3 = { x: 0, y: 0, z: 0 };
        let light_success = false;
        const x_oriented = true;
        for (let x = -2; x <= -1; x++) {
            for (let y = -3; y <= -1; y++) {
                const test_offset = { x: x_oriented ? 0 : x, y, z: x_oriented ? x : 0 };
                if (this.isUnlit(Vec3.add(position, test_offset), dimension, true)) {
                    offset = test_offset;
                    light_success = true;
                    break;
                }
            }
            if (light_success) break;
        }
        if (light_success) {
            this.lightPortal(Vec3.add(position, offset), dimension, x_oriented);
        }
        return light_success;
    }
}

export default Portal;
