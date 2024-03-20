import * as Events from "./Events"
import { world } from "@minecraft/server";

/**
 * A list of all blocktypes that are InventoryBlocks
 */
const inventoryBlocks = [
    {blockIdentifier: 'gaia:purifier', entityIdentifier: 'gaia:purifier_container', entityName: 'purifier_ui'},
    {blockIdentifier: 'gaia:restructurer', entityIdentifier: 'gaia:restructurer_container', entityName: 'restructer_ui'},
    {blockIdentifier: 'gaia:gaia_furnace', entityIdentifier: 'gaia:furnace_entity', entityName: 'gaia_furnace'},
    {blockIdentifier: 'gaia:crate', entityIdentifier: 'gaia:crate_container', entityName: 'crate_ui'},
    {blockIdentifier: 'gaia:large_crate', entityIdentifier: 'gaia:large_crate_container', entityName: 'large_crate_ui'}
];

/**
 * Fires inventoryBlockPlaced
 */
world.afterEvents.playerPlaceBlock.subscribe((eventData) => {
    for (const inventoryBlock of inventoryBlocks){
        if (inventoryBlock.blockIdentifier === eventData.block.typeId){
            const block = new InventoryBlock(eventData.block,inventoryBlock.entityIdentifier,inventoryBlock.entityName);
            Events.inventoryBlockPlaced.trigger({block:block,dimension:block.dimension,player:eventData.player});
            break;
        }
    }
})

/**
 * Fires inventoryBlockBroken
 * Note that the block returned no longer exists
 */
world.afterEvents.playerBreakBlock.subscribe((eventData) => {
    for (const inventoryBlock of inventoryBlocks){
        if (inventoryBlock.blockIdentifier === eventData.block.typeId){
            const block = new InventoryBlock(eventData.block,inventoryBlock.entityIdentifier,inventoryBlock.entityName);
            Events.inventoryBlockBroken.trigger({block:block,dimension:block.dimension,player:eventData.player});
            break;
        }
    }
})

/**
 * Represents a block with an inventory
 */
export class InventoryBlock {
    /**
     * The entity that stores the inventory for this block
     */
    #entity;

    /**
     * The block that is the block
     */
    #block;

    /**
     * Adds an inventory to a block
     * @param {Block} block Block to add inventory to
     * @param {string} entityId The entity type that serves as the inventory for this block
     */
    constructor(block, entityId, entityName){
        this.#block = block;
        this.#entity = block.dimension.spawnEntity(entityId,block.center());
        this.#entity.addTag("isInventoryBlock");
        this.#entity.nameTag = entityName;
    }

    //destructor

    /**
     * Whether the block is air (it isn't)
     */
    static isAir = false;

    /**
     * Whether the block is liquid (it isn't)
     */
    static isLiquid = false;

    /**
     * The dimension the block is in
     */
    get dimension(){ return this.#block.dimension; }

    /**
     * The location of the block
     */
    get location(){ return this.#block.location; }

    /**
     * The BlockPermutation of the block
     */
    get permutation(){ return this.#block.permutation; }

    /**
     * Returns the block steps blocks above this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps above this one
     */
    above(steps){ return this.#block.above(steps); }

    /**
     * Returns the block steps blocks below this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps below this one
     */
    below(steps){ return this.#block.below(steps); }

    /**
     * Returns the block steps blocks east of this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps east of this one
     */
    east(steps){ return this.#block.east(steps); }

    /**
     * Returns the block steps blocks west of this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps west of this one
     */
    west(steps){ return this.#block.west(steps); }

    /**
     * Returns the block steps blocks north of this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps north of this one
     */
    north(steps){ return this.#block.north(steps); }

    /**
     * Returns the block steps blocks south of this block
     * @param {number} steps Number of blocks to move
     * @returns {Block} The block steps south of this one
     */
    south(steps){ return this.#block.south(steps); }

    /**
     * Returns center position of the block
     * @returns {Vector3} The center of the block
     */
    center(){ return this.#block.center(); }

    /**
     * Returns bottom center position of the block
     * @returns {Vector3} The bottom center of the block
     */
    bottomCenter(){ return this.#block.bottomCenter(); }

    /**
     * Returns specified component of the block (use minecraft:inventory to access the inventory)
     * @returns {BlockComponent|EntityComponent} The specified component
     */
    getComponent(componentId){ 
        if (componentId == "minecraft:inventory"){
            return this.#entity.getComponent(componentId); 
        }
        return this.#block.getComponent(componentId); 
    }

    /**
     * Returns whether the inventoryBlock is valid
     * @returns {boolean} If the block (and entity) is valid
     */
    isValid(){ return this.#entity.isValid() && this.#block.isValid(); }

    /**
     * Returns the block at a given offset vector from this one
     * @param {Vector} direction The offset to get the block at
     * @returns The block at given offset from this block
     */
    offset(direction){ return this.#block.offset(direction); }
}