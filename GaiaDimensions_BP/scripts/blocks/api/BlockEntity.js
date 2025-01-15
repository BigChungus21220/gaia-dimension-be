/**
 * Handles the management of machine instances in various dimensions.
 */
class MachineInstancesHandler {
    constructor() {
        /**
         * @type {Object<string, Object<string, MachineBlockEntity>>}
         */
        this.instances = {
            "minecraft:overworld": {},
            "minecraft:nether": {},
            "minecraft:the_end": {},
        };
    }

    /**
     * Adds a machine instance to a specific dimension at the provided location.
     * @template T
     * @param {Dimension} dimension - The dimension to add the instance to.
     * @param {Vector3} location - The location to add the instance at.
     * @param {T} instance - The instance to add.
     * @returns {T} The added instance.
     */
    add(dimension, location, instance) {
        const locationString = `x${location.x}y${location.y}z${location.z}`;
        if (this.instances[dimension.id][locationString] === undefined) {
            this.instances[dimension.id][locationString] = instance;
        }
        return this.instances[dimension.id][locationString];
    }

    /**
     * Removes a machine instance from a specific dimension at the provided location.
     * @param {Dimension} dimension - The dimension to remove the instance from.
     * @param {Vector3} location - The location of the instance to remove.
     */
    destroy(dimension, location) {
        delete this.instances[dimension.id][`x${location.x}y${location.y}z${location.z}`];
    }

    /**
     * Retrieves a machine instance from a specific dimension at the provided location.
     * @param {Dimension} dimension - The dimension to get the instance from.
     * @param {Vector3} location - The location of the instance to get.
     * @returns {MachineBlockEntity} The found machine instance.
     */
    get(dimension, location) {
        return this.instances[dimension.id][`x${location.x}y${location.y}z${location.z}`];
    }

    /**
     * Logs information about a machine instance at the specified location in the specified dimension.
     * @param {Dimension} dimension - The dimension of the instance.
     * @param {Vector3} location - The location of the instance.
     * @throws {Error} Throws an error if the instance is not found or if the location or dimension is invalid.
     */
    debug(dimension, location) {
        const instance = this.instances[dimension.id][`x${location.x}y${location.y}z${location.z}`];
        if (!instance) {
            throw new Error(
                `Instance not found at dimension: ${dimension.id}, location: {x:${location.x}, y:${location.y}, z:${location.z}}`
            );
        }
        console.warn(`Location: {x:${location.x}, y:${location.y}, z:${location.z}}, TypeId: ${instance.block.typeId}`);
    }

    /**
     * Logs information about all machine instances in all dimensions.
     * @throws {Error} Throws an error if any instance is invalid.
     */
    debugInstances() {
        const dimCounter = {};
        for (const dimensionKey in this.instances) {
            dimCounter[dimensionKey] = 0;
            for (const instanceKey in this.instances[dimensionKey]) {
                const instance = this.instances[dimensionKey][instanceKey];
                if (!instance || !instance.block.isValid()) continue;
                if (instance.block.typeId === "minecraft:air") {
                    instance.entity.remove();
                    continue;
                }
                dimCounter[dimensionKey]++;
                console.warn(
                    `Dimension: ${dimensionKey}, Location: {x: ${instance.block.location.x}, y: ${instance.block.location.y}, z: ${instance.block.location.z}}, TypeId: ${instance.block.typeId}`
                );
            }
        }
        console.warn(JSON.stringify(dimCounter));
    }
}

/**
 * Singleton instance of MachineInstancesHandler class.
 */
const MachineInstances = new MachineInstancesHandler();

export { MachineInstances };


export class MachineBlockEntity {
    /**
     * @param {import('@minecraft/server').Block} block 
     * @param {import('@minecraft/server').Entity} entity
     */
    constructor(block, entity) {
        this.block = block;
        this.entity = entity;
        this.tier = 0;
    }
    destroy() {
        MachineInstances.destroy(this.block.dimension, this.block.location);
        const container = this.entity.getComponent('minecraft:inventory')?.container
        if (container) {
            for (let i = 0; i < container.size; i++) {
                if (container.getItem(i)?.typeId == 'cosmos:ui') {
                    container.setItem(i, undefined)
                }
            }
        }
        try {
            this.entity.runCommand('kill @s')
            this.entity.remove()
        } catch (error) {null}
    }
}