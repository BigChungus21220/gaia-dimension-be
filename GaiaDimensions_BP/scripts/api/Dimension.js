import { Vector, BlockPermutation,Dimension,system,Block, world, BlockVolumeUtils, BlockVolumeIntersection,Entity, Player } from "@minecraft/server"
import gaia from "../world.js"

const biomes = [
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
 * A class that wraps the dimension of gaia
 */
export class Gaia extends Portal {
    
    constructor() {}
 /**
  * Get the Entities within the Gaia Dimension
  * @returns {Entity[]}
  */
    getEntities(){
    return world.getDimension('the end').getEntities({location:{x:200000,y:0,z:200000},farthest:400000,closest:200000})
    }
/**
 * Returns Whether or not a player is in the Gaia Dimension
 * @param {Player} player 
 * @returns {boolean}
 */
    isInGaia(player){
        let playerLoc = player.location
        return player.dimension.id == "minecraft:the_end" && playerLoc.x <= 400000 && playerLoc.z <= 400000 && playerLoc.x >= 200000 && playerLoc.z >= 200000 
    }
/**
 * Returns the name of a biome in Gaia based of a location
 * @param {Vector} position 
 * @param {Dimension} dimension 
 * @returns {string} The biome name
 */
    getBiome(position, dimension){
        let blockId = dimension.getBlock(new Vector(position.x, 0, position.z))?.typeId
        if (blockId.includes("gaia:bedrock_")){
            return blockId.replace("gaia:bedrock_","")
        } else {
            return "none"
        }
    }
/**
 * Starts the genertion of fog in the Gaia dimension
 */
   pushFog(){
    this.generateFog()
}
    
}







/**
 * @typedef Link
 * @property {Vector} location
 * @property {Vector} linkedLocation
 * @property {Vector} size
 */

/**
 * @author Redux
 * 
 * @description Class that manages Portals and Portal Linking.
 */
class Portal extends Fog {
    /**
     * Create a PortalLink.
     */
    constructor() {
        /**
         * @type {Array<Link>}
         * @private
         */
      this.linked = JSON.parse(world.getDynamicProperty('PortalLinked') ?? "[]");
      /**
       * @private
       */
      this.serialize = JSON.stringify;
    }
  
    /**
     * Link two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @param {Vector} size - The size of the portal.
     */
    link(fromLocation, toLocation,size) {
      if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
        throw new Error('Both fromLocation and toLocation must be objects');
      }
      const data = { location: fromLocation, linkedLocation: toLocation, size:size };
      if (!this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation)) {
        this.linked.push(data);
        console.warn(this.serialize(this.linked))
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
      }
    }
  
    /**
     * Unlinks a link between two locations.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     */
    unlink(fromLocation, toLocation) {
        if (typeof fromLocation !== 'object' || typeof toLocation !== 'object') {
            throw new Error('Both fromLocation and toLocation must be objects');
        }
       this.linked = this.linked.filter(l=>{
        l.location != fromLocation && l.linkedLocation != toLocation
       })
        world.setDynamicProperty('PortalLinked', this.serialize(this.linked));
    }
  /**
 * Get the linked location from a given location.
 * @param {Vector} location - The location.
 * @param {string} from - Whether the location is the start or end of the linked location
 * @returns {Link} The linked object.
 */
getLink(from, location){
    if (typeof location !== 'object') {
        throw new Error('location must be an object');
    }
    let link;
    switch(from) {
        case 'start':
            link = this.linked.find(d => {
                const volume = {from: d.location, to: {x:d.location.x+d.size.x,y:d.location.y+d.size.y,z:d.location.z+d.size.z}};
                console.warn(BlockVolumeUtils.isInside(volume, location))
                return BlockVolumeUtils.isInside(volume, location);
            });
            break;
        case 'end':
            link = this.linked.find(d => {
                const volume = {from: d.linkedLocation,  to: {x:d.linkedLocation.x+d.size.x,y:d.linkedLocation.y+d.size.y,z:d.linkedLocation.z+d.size.z}} ;
                return BlockVolumeUtils.isInside(volume, location);
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
    getAllLinks(){
        return this.linked;
    }

    /**
     * Clear all links.
     */
    clearAllLinks(){
        this.linked = []
        world.setDynamicProperty('PortalLinked',this.serialize(this.linked))
    }
    
    /**
     * Check if two locations are linked.
     * @param {Vector} fromLocation - The starting location.
     * @param {Vector} toLocation - The ending location.
     * @returns {boolean} True if the locations are linked, false otherwise.
     */
    isLinked(fromLocation,toLocation){
        return this.linked.some((d) => d.location === fromLocation && d.linkedLocation === toLocation);
    }

    /**
     * Get the count of links.
     * @returns {number} The count of links.
     */
    getCount(){
        return this.linked.length
    }

    /**
     * Check if a link exists.
     * @param {Link} link - The link to check.
     * @returns {boolean} True if the link exists, false otherwise.
     */
    hasLink(link){
        return this.linked.includes(link)
    }
/**
 * Check if an entity is within the bounds of a linked portal.
 * @param {Entity} entity - The entity to check.
 * @param {string} from - Whether the entity is at the start or end of the linked location
 * @returns {Link|undefined} The link that the entity is in, or undefined if the entity is not in any linked portal.
 */
isEntityInLinked(from, entity) {
    if (typeof entity !== 'object') {
        throw new Error('entity must be an object');
    }
    let link;
    switch(from){
        case 'start':
            link = this.linked.find(link => {
                const volume = {from: link.location, to: {x:link.location.x+link.size.x,y:link.location.y+link.size.y,z:link.location.z+link.size.z}};
                return BlockVolumeUtils.isInside(volume, entity.location);
            });
            break;

        case 'end':
            link = this.linked.find(link => {
                const volume = {from: link.linkedLocation, to: {x:link.linkedLocation.x+link.size.x,y:link.linkedLocation.y+link.size.y,z:link.linkedLocation.z+link.size.z}};
                return BlockVolumeUtils.isInside(volume, entity.location);
            });
            break;
        default:
            throw new Error(`Invalid value for 'from': ${from}`);
    }
    return link || undefined;
}

lightPortal (corner, dimension, x_oriented){
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge){
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:keystone_block"))
            } else {
                dimension.getBlock(blockpos).setPermutation(BlockPermutation.resolve("gaia:gaia_portal", {"gaia:x_oriented": x_oriented}))
            }
        }
    }
}

breakPortal(corner, dimension, x_oriented){
    for (let x = -3; x <= 3; x++){
        for (let y = -3; y <= 3; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let block = dimension.getBlock(blockpos);
            let adjacent = block.getAdjacent()
            if (block.type.id === 'gaia:gaia_portal'){
                ['start', 'end'].forEach(position => {
                    const link = this.getLink(position, blockpos)
                    if(link){
                        this.unlink(link.location, link.linkedLocation)
                    } else return;
                });
                block.setPermutation(BlockPermutation.resolve("minecraft:air"));
            }
            adjacent.filter(b=>{
                b.typeId === 'gaia:gaia_portal'
            }).forEach(b=>{
                ['start', 'end'].forEach(position => {
                    const link = this.getLink(position, b.location)
                    if(link){
                        this.unlink(link.location, link.linkedLocation)
                    } else return
                });
                b.setPermutation(BlockPermutation.resolve("minecraft:air"));
            })
        }
    }
}

isLit(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "gaia:gaia_portal"){
                isValid = false
                break
            }
        }
    }
    return isValid
}

isUnlit(corner, dimension, x_oriented){
    let isValid = true
    for (let x = 0; x < 4; x++){
        for (let y = 0; y < 5; y++){
            let blockpos = Vector.add(corner, new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0));
            let blocktype = dimension.getBlock(blockpos).typeId
            let is_edge = x == 0 || y == 0 || x == 3 || y == 4
            if (is_edge && blocktype != "gaia:keystone_block"){
                isValid = false
                break
            }
            if (!is_edge && blocktype != "minecraft:air"){
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
 */
canLight(block){
    let position = block.location
    let dimension = block.dimension
    let offset = Vector.zero
    let light_success = false
    let x_oriented = true
    for (let x = -2; x <= -1; x++){
        for (let y = -3; y <= -1; y++){
            let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
            if (this.isUnlit(Vector.add(position, test_offset), dimension, true)){
                offset = test_offset
                light_success = true
                break
            }
        }
    }
    if (!light_success){
        x_oriented = false
        for (let x = -2; x <= -1; x++){
            for (let y = -3; y <= -1; y++){
                let test_offset = new Vector(x_oriented ? 0 : x, y, x_oriented ? x : 0)
                if (this.isUnlit(Vector.add(position, test_offset), dimension, false)){
                    offset = test_offset
                    light_success = true
                    break
                }
            }
        }
    }

    if (light_success){
        this.lightPortal(Vector.add(position, offset), dimension, x_oriented)
    }
}


convertCoords(location, fromDimension, toDimension) {
    const scaleFactor = 1 / 4; // 1 block in 'gaia' is 4 blocks in 'overworld'
    const xOffset = 300000; // Offset for the x-axis
    const zOffset = 300000; // Offset for the z-axis

    switch (fromDimension) {
        case 'minecraft:overworld':
            switch (toDimension) {
                case 'gaia:gaia':
                    return {
                        x: Math.floor((location.x + xOffset) * scaleFactor+200000),
                        y: location.y,
                        z: Math.floor((location.z + zOffset) * scaleFactor+200000)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        case 'gaia:gaia':
            switch (toDimension) {
                case 'minecraft:overworld':
                    return {
                        x: Math.floor(location.x / scaleFactor),
                        y: location.y,
                        z: Math.floor(location.z / scaleFactor)
                    };
                default:
                    throw new Error(`Unsupported conversion to ${toDimension}`);
            }
        default:
            throw new Error(`Unsupported conversion from ${fromDimension}`);
    }
}
}

class Fog {
    constructor (){}

  generateFog(){
 let playerData = {}
  system.runInterval(() => {
    let players = world.getPlayers()
    for (let player of players){
        let playerId = player.id
        let playerInArea = gaia.isInGaia(player)
        let playerLocation = player.location

        if (
            playerData[playerId] === undefined ||
            playerData[playerId].lastInArea != playerInArea ||
            (playerInArea && !floorEquals(playerLocation, playerData[playerId].lastLocation))
        ){
            this.updateFog(player)
        }
        playerData[playerId] = {
            lastInArea: playerInArea,
            lastLocation: playerLocation
        }
    }
}, 8)
  }
    clearFogs(player){
        for (const biome of biomes){
            player.runCommandAsync("fog @s remove " + biome)
        }
    }

    addFog(player, biome){
        player.runCommandAsync("fog @s push gaia:" + biome + "_fog " + biome)
    }

    updateFog(player){
        this.clearFogs(player)
        let biome = gaia.getBiome(player.location, player.dimension);
        if (biome != "none"){
            this.addFog(player, biome)
        }
    }

    
}


function floorEquals(a, b){
    return Math.floor(a.x) == Math.floor(b.x) && Math.floor(a.z) == Math.floor(b.z)
}
