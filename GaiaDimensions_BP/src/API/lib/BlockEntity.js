/**
 * --- Block Entity Registration Library ---
 *
 * This library simplifies the creation of custom "block entities".
 * It automatically handles spawning, despawning, interaction, and ticking.
 */
import { world, system } from "@minecraft/server";

class BlockEntityManager {
    registeredMachineClasses = new Map();
    activeMachineInstances = new Map(); // Maps entity.id -> Machine instance
    activeMachineList = []; // Array for efficient batch processing
    locationToEntityId = new Map(); // Optimization: Maps "x,y,z" -> entity.id
    lastProcessedIndex = 0; // For budget-based ticking
    pendingSpawns = new Set(); // Track locations currently being spawned to prevent duplicates
    lastPlacementTick = 0; // Global cooldown to prevent self-healing race conditions

    constructor() {
        this.registerEventListeners();
    }

    /**
     * Registers a new machine class with the system.
     * @param {import("./Machine.js").Machine} machineClass The class definition of the machine.
     */
    register(machineClass) {
        if (!machineClass || !machineClass.NAME) {
            console.warn("[BlockEntity] Registration failed: machineClass must have a static NAME property.");
            return;
        }
        const blockId = `gaiadimension:${machineClass.NAME}`;
        this.registeredMachineClasses.set(blockId, machineClass);
        
        // Dynamically register UI items from this machine to be globally banned from drops
        if (typeof machineClass.processUiConfig === 'function') {
            machineClass.processUiConfig(machineClass.UI_CONFIG);
        }
    }

    registerEventListeners() {
        world.afterEvents.playerPlaceBlock.subscribe(this.handlePlayerPlaceBlock.bind(this));
        world.beforeEvents.playerBreakBlock.subscribe(this.handlePlayerBreakBlock.bind(this));
      
        world.afterEvents.explosion.subscribe(this.handleExplosion.bind(this));

        system.runInterval(this.handlePlayerViewCheck.bind(this), 5);
        system.runInterval(this.handleMachineTick.bind(this), 1);
        world.afterEvents.worldLoad.subscribe(this.handleWorldLoad.bind(this));
        world.afterEvents.entityLoad.subscribe(this.handleEntityLoad.bind(this));
    }

    handleExplosion(event) {
        const impactedBlocks = event.getImpactedBlocks();
        for (const block of impactedBlocks) {
             const location = block.location;
             const locKey = `${location.x},${location.y},${location.z}`;
             const entityId = this.locationToEntityId.get(locKey);
             
             if (entityId) {
                 const machineInstance = this.activeMachineInstances.get(entityId);
                 if (machineInstance) {
                     this.removeMachine(entityId, machineInstance);
                 }
             }
        }
    }

    handleEntityLoad(event) {
        const entity = event.entity;
        if (entity.typeId.startsWith('luminiae_generic:block_entity')) {
             this.registerEntityAsMachine(entity);
        }
    }

    registerEntityAsMachine(entity) {
        if (this.activeMachineInstances.has(entity.id)) return;

        let blockLocationStr = entity.getDynamicProperty('blockLocation');
        let blockLocation;

        // Determine blockId
        let blockId = entity.getDynamicProperty('machineId');

        if (blockLocationStr) {
            try {
                blockLocation = JSON.parse(blockLocationStr);
            } catch (e) {
                console.warn(`[BlockEntity] Corrupt blockLocation data for ${entity.id}`);
            }
        }

        // Auto-recovery: If data is missing or corrupt, try to find the block at the entity's current position
        if (!blockLocation || !blockId) {
            const loc = entity.location;
            const candidateLoc = { x: Math.floor(loc.x), y: Math.floor(loc.y), z: Math.floor(loc.z) };
            
            // Try to find a registered machine block at this location
            // We can't know the exact block ID if it's generic and missing property, so we check the block at world
            try {
                const candidateBlock = entity.dimension.getBlock(candidateLoc);
                if (candidateBlock && this.registeredMachineClasses.has(candidateBlock.typeId)) {
                    console.warn(`[BlockEntity] Auto-healing lost link for ${entity.id} at ${candidateLoc.x}, ${candidateLoc.y}, ${candidateLoc.z}`);
                    blockLocation = candidateLoc;
                    blockId = candidateBlock.typeId;
                    
                    // Restore properties
                    entity.setDynamicProperty('blockLocation', JSON.stringify(blockLocation));
                    if (entity.typeId.startsWith('luminiae_generic:block_entity')) {
                        entity.setDynamicProperty('machineId', blockId);
                    }
                } else {
                    return; // Cannot recover
                }
            } catch (e) { return; }
        }

        if (this.registeredMachineClasses.has(blockId)) {
            try {
                // Note: We access dimension directly from entity, assuming it's valid if entity is loaded
                const block = entity.dimension.getBlock(blockLocation);
                
                if (block && block.typeId === blockId) {
                    const MachineClass = this.registeredMachineClasses.get(blockId);
                    const machineInstance = new MachineClass(entity, block);
                    
                    // Optimization: Generate and store locKey on the instance
                    machineInstance.locKey = `${blockLocation.x},${blockLocation.y},${blockLocation.z}`;
                    
                    this.activeMachineInstances.set(entity.id, machineInstance);
                    this.activeMachineList.push(machineInstance);
                    this.locationToEntityId.set(machineInstance.locKey, entity.id);
                    
                    // console.warn(`[BlockEntity] Registered machine via entityLoad/worldLoad: ${entity.id}`);
                }
            } catch(e) {
                console.warn(`[BlockEntity] Error registering entity ${entity.id}: ${e}`);
            }
        }
    }

    handlePlayerPlaceBlock(event) {
        const { block } = event;
        // Global cooldown for self-healing
        this.lastPlacementTick = system.currentTick;

        if (this.registeredMachineClasses.has(block.typeId)) {
            const x = Math.floor(block.location.x);
            const y = Math.floor(block.location.y);
            const z = Math.floor(block.location.z);
            const locKey = `${x},${y},${z}`;
            
            // DUPLICATE PREVENTION: If the map already has an entity here (e.g. from self-healing), stop.
            if (this.locationToEntityId.has(locKey)) {
                console.warn(`[BlockEntity] Skipping spawn at ${locKey}: Entity already registered.`);
                return;
            }

            this.pendingSpawns.add(locKey);

            system.run(() => {
                try {
                    // Double-check inside the run loop in case self-healing happened in between
                    if (this.locationToEntityId.has(locKey)) return;

                    const MachineClass = this.registeredMachineClasses.get(block.typeId);
                    const useLarge = MachineClass.INVENTORY_SIZE === 54;
                    const entityId = useLarge ? 'luminiae_generic:block_entity_large' : 'luminiae_generic:block_entity';

                    const center = { x: x + 0.5, y: y + 0.5, z: z + 0.5 };
                    const entity = block.dimension.spawnEntity(entityId, center);
                    entity.setDynamicProperty('blockLocation', JSON.stringify({x, y, z}));
                    entity.setDynamicProperty('machineId', block.typeId);
                    
                    const machineInstance = new MachineClass(entity, block);
                    machineInstance.locKey = locKey;

                    this.activeMachineInstances.set(entity.id, machineInstance);
                    this.activeMachineList.push(machineInstance);
                    this.locationToEntityId.set(locKey, entity.id);
                } catch (e) {
                    console.warn(`[BlockEntity] Error spawning/registering: ${e}`);
                } finally {
                    this.pendingSpawns.delete(locKey);
                }
            });
        }
    }

    handlePlayerBreakBlock(event) {
        const { block } = event;
        if (this.registeredMachineClasses.has(block.typeId)) {
            // Optimization: Use O(1) lookup to find the entity for this block
            const locKey = `${block.location.x},${block.location.y},${block.location.z}`;
            const entityId = this.locationToEntityId.get(locKey);

            if (entityId) {
                 const machineInstance = this.activeMachineInstances.get(entityId);
                 if (machineInstance) {
                     this.removeMachine(entityId, machineInstance);
                 }
            }
        }
    }

    removeMachine(entityId, machineInstance) {
        // Debug: Check validity
        // console.warn(`[BlockEntity] Removing machine ${entityId}. Entity valid: ${machineInstance.entity?.isValid}`);

        // Eject items before destroying
        if (machineInstance && typeof machineInstance.destroy === 'function') {
            try {
                machineInstance.destroy();
            } catch (e) {
                console.error(`Error destroying machine instance: ${e}`);
            }
        }

        this.activeMachineInstances.delete(entityId);
        
        // Remove from list (O(N) but rare operation)
        const index = this.activeMachineList.indexOf(machineInstance);
        if (index > -1) {
            this.activeMachineList.splice(index, 1);
        }

        // Clean up location map
        if (machineInstance.locKey) {
            this.locationToEntityId.delete(machineInstance.locKey);
        }

        if (machineInstance.entity && machineInstance.entity.isValid) {
            // Remove entity immediately if possible, or schedule it
            // Attempt synchronous remove first to ensure it's gone
            try {
                machineInstance.entity.remove();
            } catch (e) {
                // Fallback to system.run if sync remove fails (e.g. inside read-only event context?)
                // Note: remove() is usually allowed in BeforeEvents or system.run
                system.run(() => {
                    try {
                        if (machineInstance.entity.isValid) machineInstance.entity.remove();
                    } catch (e2) {
                        console.error(`[BlockEntity] Error removing entity: ${e2}`);
                    }
                });
            }
        }
    }

    /**
     * Centralized Raycasting: Offloads physics checks from hundreds of individual machines 
     * to a single per-player pass. Flags viewed machines for prioritized 20TPS updates.
     */
    handlePlayerViewCheck() {
        // Reset all machines; viewing state is re-evaluated every 5 ticks
        for (const machine of this.activeMachineList) {
            machine.isViewed = false;
        }

        const machinesToShrink = new Set();
        
        // Single pass over players to identify targets
        for (const player of world.getAllPlayers()) {
            // A. Block Raycast: Precision mapping to locKey
            const blockHit = player.getBlockFromViewDirection({ maxDistance: 7 });
            let targetMachine = null;

            if (blockHit) {
                const locKey = `${blockHit.block.x},${blockHit.block.y},${blockHit.block.z}`;
                const entityId = this.locationToEntityId.get(locKey);
                if (entityId) {
                    targetMachine = this.activeMachineInstances.get(entityId);
                } else if (this.registeredMachineClasses.has(blockHit.block.typeId) && !this.pendingSpawns.has(locKey)) {
                    // SELF-HEALING: Block exists but no entity. Spawn one!
                    // Check pendingSpawns to avoid race condition with player placement
                    // Also check global placement cooldown (20 ticks / 1 second)
                    if (system.currentTick - this.lastPlacementTick > 20) {
                        console.warn(`[BlockEntity] Self-healing missing entity at ${locKey}`);
                        
                        try {
                            const MachineClass = this.registeredMachineClasses.get(blockHit.block.typeId);
                            const useLarge = MachineClass.INVENTORY_SIZE === 54;
                            const entityTypeId = useLarge ? 'luminiae_generic:block_entity_large' : 'luminiae_generic:block_entity';
                            const center = { x: blockHit.block.x + 0.5, y: blockHit.block.y + 0.5, z: blockHit.block.z + 0.5 };

                            // CHECK PHYSICAL WORLD: Is there already an entity here that we just missed in the map?
                            const existingEntities = blockHit.block.dimension.getEntities({
                                location: center,
                                maxDistance: 0.8,
                                type: entityTypeId
                            });

                            let entity;
                            if (existingEntities.length > 0) {
                                // Bind to existing
                                entity = existingEntities[0];
                                console.warn(`[BlockEntity] Found physical entity ${entity.id}, rebinding...`);
                            } else {
                                // Spawn new
                                entity = blockHit.block.dimension.spawnEntity(entityTypeId, center);
                                entity.setDynamicProperty('blockLocation', JSON.stringify(blockHit.block.location));
                                entity.setDynamicProperty('machineId', blockHit.block.typeId);
                            }
                            
                            // Register (or re-register)
                            if (this.activeMachineInstances.has(entity.id)) return; // Already valid?

                            const machineInstance = new MachineClass(entity, blockHit.block);
                            machineInstance.locKey = locKey;
    
                            this.activeMachineInstances.set(entity.id, machineInstance);
                            this.activeMachineList.push(machineInstance);
                            this.locationToEntityId.set(locKey, entity.id);
                            
                            targetMachine = machineInstance;
                        } catch (e) {
                            console.warn(`[BlockEntity] Failed to self-heal: ${e}`);
                        }
                    }
                }
            }

            // B. Entity Raycast: Resolves hits on the machine's interactive entity hitbox
            if (!targetMachine) {
                 const entityHits = player.getEntitiesFromViewDirection({ maxDistance: 7 });
                 for (const hit of entityHits) {
                     if (this.activeMachineInstances.has(hit.entity.id)) {
                         targetMachine = this.activeMachineInstances.get(hit.entity.id);
                         break;
                     }
                 }
            }

            if (targetMachine) {
                targetMachine.isViewed = true;

                // Handle 'wrench' state (Sneaking/Holding tools)
                const isSneaking = player.isSneaking;
                const mainhandItem = player.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId || '';
                const isHoldingTool = mainhandItem.includes('_pickaxe') || mainhandItem.includes('wrench');

                if (isSneaking || isHoldingTool) {
                    machinesToShrink.add(targetMachine.entity.id);
                }
            }
        }

        // Apply visual shrink/expand state changes
        for (const machineInstance of this.activeMachineList) {
            const entity = machineInstance.entity;
            if (!entity || !entity.isValid) continue;

            const shouldShrink = machinesToShrink.has(entity.id);
            const isShrunk = entity.hasTag('shrunk');

            if (shouldShrink && !isShrunk) {
                entity.triggerEvent("general_block_entity:shrink");
                entity.addTag('shrunk');
            } else if (!shouldShrink && isShrunk) {
                entity.triggerEvent("general_block_entity:expand");
                entity.removeTag('shrunk');
            }
        }
    }

    /**
     * Priority & Budget Ticking:
     * 1. Priority: Viewed machines tick every frame (20TPS) for smooth UI.
     * 2. Budget: Ambient machines tick via round-robin with DT compensation.
     */
    handleMachineTick() {
        const totalMachines = this.activeMachineList.length;
        if (totalMachines === 0) return;

        const PROCESS_LIMIT = 40; 
        const TIME_BUDGET_MS = 5; 
        const startTime = Date.now();
        const currentTick = system.currentTick;

        // --- Priority Ticking (Active Viewers) ---
        for (const machine of this.activeMachineList) {
            if (machine.isViewed && machine.entity?.isValid) {
                try {
                    const dt = currentTick - machine.lastTickTime;
                    if (dt > 0) {
                        if (machine.block && machine.block.typeId === `gaiadimension:${machine.config.NAME}`) {
                            machine.tick(dt);
                            machine.lastTickTime = currentTick;
                        }
                    }
                } catch (e) {
                     console.error(`Error ticking viewed machine: ${e}`);
                }
            }
        }

        // --- Budget Ticking (Ambient/Background) ---
        let processedCount = 0;
        let attempts = 0;
        while (processedCount < PROCESS_LIMIT && attempts < totalMachines) {
            if (Date.now() - startTime > TIME_BUDGET_MS) break;

            this.lastProcessedIndex = (this.lastProcessedIndex + 1) % totalMachines;
            const machine = this.activeMachineList[this.lastProcessedIndex];
            attempts++;

            if (!machine || machine.isViewed) continue;

            if (!machine.entity?.isValid) {
                 this.removeMachine(machine.entity.id, machine);
                 this.lastProcessedIndex--;
                 continue;
            }

            try {
                const dt = currentTick - machine.lastTickTime;
                if (dt > 0) {
                     // Protect against Unloaded Chunks: Accessing block properties might fail.
                     let currentBlockTypeId;
                     try {
                         currentBlockTypeId = machine.block?.typeId;
                     } catch (err) {
                         // Chunk unloaded. Skip this machine, do not remove.
                         continue;
                     }

                     if (machine.block && currentBlockTypeId === `gaiadimension:${machine.config.NAME}`) {
                        machine.tick(dt);
                        machine.lastTickTime = currentTick;
                        processedCount++;
                    } else {
                        // console.warn(`[BlockEntity] Removing ambient machine ${machine.entity.id} at ${machine.locKey}. Block mismatch. Expected: gaiadimension:${machine.config.NAME}, Got: ${currentBlockTypeId}`);
                        this.removeMachine(machine.entity.id, machine);
                        this.lastProcessedIndex--;
                    }
                }
            } catch (e) {
                console.error(`Error ticking ambient machine: ${e}`);
            }
        }
    }

    handleWorldLoad() {
        console.warn("[BlockEntity] World load handling started...");
        const dimensions = ["overworld", "nether", "the_end"].map(id => world.getDimension(id));
        dimensions.forEach(dimension => {
            const entities = dimension.getEntities({ families: ['luminiae_generic'] });
            console.warn(`[BlockEntity] Found ${entities.length} generic block entities in ${dimension.id}`);
            for (const entity of entities) {
               this.registerEntityAsMachine(entity);
            }
        });
    }

    getXP(blockLocation) {
        let xp = 0;
        const locKey = `${blockLocation.x},${blockLocation.y},${blockLocation.z}`;
        const entityId = this.locationToEntityId.get(locKey);
        
        if (entityId) {
            const machine = this.activeMachineInstances.get(entityId);
            if (machine && typeof machine.getRequiredXP === 'function') {
                xp = machine.getRequiredXP();
            }
        }
        return xp;
    }
}

const blockEntityManager = new BlockEntityManager();
export default blockEntityManager;