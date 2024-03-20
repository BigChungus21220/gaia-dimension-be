import { Vector } from "@minecraft/server"
import { the_end } from "../utils";

/**
 * Class containing methods relating to the Gaia dimension
 */
export class Gaia {

    /**
     * Range of blocks in the end that Gaia takes up
     */
    static range = {start:{x:100000, z:100000}, end:{x:400000, z:400000}};

    /**
     * Center block of Gaia dimension
     */
    static origin = {x:(100000 + 400000)/2,z:(100000 + 400000)/2};

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
     * Checks whether a given location is in Gaia
     * @param {Vector} location location to check
     * @returns {boolean} Whether or not the location is in Gaia
     */
    static isInGaia(location){
        return Gaia.range.start.x <= location.x && location.x <= Gaia.range.end.x && Gaia.range.start.z <= location.z && location.z <= Gaia.range.end.z;
    }

    /**
     * Gets the biome that a given location is in
     * @param {Vector} location location to check
     * @returns {string|boolean} The biome the location is in (if applicable, otherwise false)
     */
    static getBiome(location){
        if (this.isInGaia(location)){
            const block = this.getBlock(new Vector(location.x,0,location.z)).typeId.replace("gaia:bedrock_","");
            if (block == null){
                return false;
            } else {
                return block;
            }
        }
        return false;
    }

    /**
     * Gets all entities in the Gaia dimension that match the EntityQueryOptions
     * @param {EntityQueryOptions} entityQueryOptions Query to use for search
     * @returns {Entity[]} All entities matching the query
     */
    static getEntities(entityQueryOptions){
        return the_end.getEntities(entityQueryOptions).filter((entity) => this.isInGaia(entity.location));
    }

    /**
     * Gets all players in the Gaia dimension that match the EntityQueryOptions
     * @param {EntityQueryOptions} entityQueryOptions Query to use for search
     * @returns {Player[]} All players matching the query
     */
    static getPlayers(entityQueryOptions){
        return the_end.getPlayers(entityQueryOptions).filter((entity) => this.isInGaia(entity.location));
    }

    /**
     * Returns the block at the given location
     * @param {Vector} location Location to get block from
     * @returns {Block} The block at the location
     */
    static getBlock(location){
        return the_end.getBlock(location);
    }

    /**
     * Runs a command in Gaia
     * @param {string} command Command to run
     * @returns {CommandResult} The result of the command
     */
    static run_command(command){
        return the_end.run_command(command);
    }

    /**
     * Spawns an entity in Gaia
     * @param {string} identifier Entity type to spawn
     * @param {Vector} location Location to spawn entity
     * @returns {Entity} The spawned entity
     */
    static spawnEntity(identifier, location){
        return the_end.spawnEntity(identifier, location);
    }

    /**
     * Spawns an item in Gaia
     * @param {ItemStack} itemStack Item stack to spawn
     * @param {Vector} location Location to spawn item
     * @returns {Entity} The spawned item entity
     */
    static spawnItem(itemStack, location){
        return the_end.spawnItem(itemStack, location);
    } 

    /**
     * Spawns a particle effect in Gaia
     * @param {ItemStack} itemStack Particle to spawn
     * @param {Vector} location Location to spawn particle
     * @param {MolangVariableMap} molangVariables optional varibles for this particle
     */
    static spawnParticle(effectName, location, molangVariables = {}){
        return the_end.spawnParticle(effectName, location, molangVariables);
    } 
}

