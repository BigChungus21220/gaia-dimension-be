import { world, system, Entity as VanillaEntity } from "@minecraft/server";
import { Entity } from "./net/minecraft/world/entity/Entity.js";
import { DeferredRegister } from "./net/neoforged/neoforge/registries/DeferredRegister.js";
import { EntityType } from "./net/minecraft/world/entity/EntityType.js";
import { Level } from "./net/minecraft/world/level/Level.js";

export class EntityRegistry {
    private static readonly TYPE_MAP: Map<string, new (entity: VanillaEntity) => any> = new Map();
    private static readonly INSTANCES: Map<string, any> = new Map();

    /**
     * Checks if an entity type is registered in the system.
     */
    public static typeExists(typeId: string): boolean {
        return this.TYPE_MAP.has(typeId);
    }

    /**
     * Initializes the runtime entity listener.
     */
    public static init(): void {
        // Register all types from the DeferredRegisters
        for (const registry of DeferredRegister.REGISTRIES) {
            for (const [name, holder] of registry.getEntries()) {
                const type = holder.get() as EntityType<any>;
                const fullId = `${registry.getNamespace()}:${name}`;
                this.TYPE_MAP.set(fullId, type.factory);
            }
        }

        // Listen for new entities being spawned (natural/fallback)
        world.afterEvents.entitySpawn.subscribe((event) => {
            if (this.INSTANCES.has(event.entity.id)) return;
            system.run(() => {
                EntityRegistry.tryBootstrapEntity(event.entity);
            });
        });

        // Listen for entities being loaded (e.g. on world load)
        world.afterEvents.entityLoad.subscribe((event) => {
            if (this.INSTANCES.has(event.entity.id)) return;
            system.run(() => {
                EntityRegistry.tryBootstrapEntity(event.entity);
            });
        });

        // Handle script events for immediate bootstrapping and multipart hand-off
        system.afterEvents.scriptEventReceive.subscribe((event) => {
            if (event.id.endsWith(":spawn_bootstrap")) {
                const entity = event.sourceEntity;
                if (!entity) return;

                const [namespace, name] = entity.typeId.split(":");
                
                // Generic Multipart Hand-off: If a redirected variant (head) exists, swap immediately
                if (namespace && name && !name.endsWith("_head") && !name.endsWith("_segment")) {
                    const head = Level.spawnEntity(entity.dimension, entity.typeId, entity.location);
                    
                    // If we successfully redirected to a head, bootstrap it immediately and remove dummy
                    if (head && head.typeId !== entity.typeId) {
                        EntityRegistry.tryBootstrapEntity(head);
                        entity.remove();
                        return;
                    }
                }

                // Normal immediate bootstrap for non-multipart entities
                EntityRegistry.tryBootstrapEntity(entity);
            }
        });

        // Ticking loop for all logic-heavy entities
        system.runInterval(() => {
            for (const [id, instance] of this.INSTANCES) {
                if (instance.isRemoved()) {
                    this.INSTANCES.delete(id);
                    continue;
                }
                instance.tick();
            }
        }, 1);
    }

    /**
     * Bootstraps a native Bedrock entity into its corresponding TypeScript class instance.
     * Returns the instance if successful.
     */
    public static tryBootstrapEntity(entity: VanillaEntity): any {
        if (!entity || !entity.isValid) return null;
        if (this.INSTANCES.has(entity.id)) return this.INSTANCES.get(entity.id);

        const factory = this.TYPE_MAP.get(entity.typeId);
        if (factory) {
            const instance = new factory(entity);
            this.INSTANCES.set(entity.id, instance);
            return instance;
        }
        return null;
    }
}
