import { Datagen } from "./Datagen.js";
import * as path from "path";
import { DeferredRegister } from "../native/net/neoforged/neoforge/registries/DeferredRegister.js";
import { EntityType, MovementMode } from "../native/net/minecraft/world/entity/EntityType.js";
import { Attributes } from "../native/net/minecraft/world/entity/ai/attributes/Attributes.js";
import { Mob } from "../native/net/minecraft/world/entity/Mob.js";
import { EntityDataAccessor } from "../native/net/minecraft/network/syncher/SynchedEntityData.js";

export class EntityGenerator extends Datagen {
    constructor(outputDir: string) {
        super(outputDir);
    }

    public generate(): void {
        for (const registry of DeferredRegister.REGISTRIES) {
            const namespace = registry.getNamespace();
            const entries = registry.getEntries();

            for (const [name, holder] of entries) {
                const entityType = holder.get() as EntityType<any>;
                
                let folderPath = "";
                if (name.startsWith("naga")) {
                    folderPath = path.join("twilightforest", "mobs", "multi_entity", "naga");
                }

                // Generic Spawner Detection: If there's a corresponding _head variant, this is a dummy spawner
                const isSpawner = !name.endsWith("_head") && !name.endsWith("_segment") && entries.has(`${name}_head`);

                this.generateEntityBehavior(namespace, name, entityType, folderPath, isSpawner);
                if (entityType.clientData) {
                    this.generateEntityClient(namespace, name, entityType, folderPath);
                }
            }
        }
    }

    private generateEntityBehavior(namespace: string, name: string, type: EntityType<any>, folderPath: string, isSpawner: boolean): void {
        const id = `${namespace}:${name}`;
        
        // Common bootstrap command for all main entities (non-segments)
        const bootstrapCommand = {
            queue_command: {
                command: [
                    `scriptevent ${namespace}:spawn_bootstrap`
                ]
            }
        };

        if (isSpawner) {
            const spawnerBehavior = {
                format_version: "1.20.80",
                "minecraft:entity": {
                    description: {
                        identifier: id,
                        is_spawnable: true,
                        is_summonable: true,
                        spawn_category: type.spawnCategory || "monster"
                    },
                    components: {
                        "minecraft:type_family": { family: [namespace, "spawner"] },
                        "minecraft:collision_box": { width: 0.1, height: 0.1 }
                    },
                    events: {
                        "minecraft:entity_spawned": bootstrapCommand
                    }
                }
            };
            this.writeJson(path.join("BP", "entities", folderPath, `${name}.json`), spawnerBehavior);
            return;
        }

        const properties: Record<string, any> = {};
        const components: any = {
            "minecraft:type_family": { family: [namespace, "monster", name] },
            "minecraft:collision_box": { width: type.width, height: type.height },
            "minecraft:health": { value: 100, max: 100 }
        };

        const entityMock: any = {
            id: "mock-id",
            location: { x: 0, y: 0, z: 0 },
            typeId: id,
            getComponent: (id: string) => ({ currentValue: 100, effectiveMax: 100 }),
            getDynamicProperty: (key: string) => null,
            setDynamicProperty: (key: string, val: any) => {},
            getRotation: () => ({ x: 0, y: 0 }),
            teleport: (loc: any, options?: any) => {},
            triggerEvent: (id: string) => {},
            isValid: true,
            getX: () => 0, getY: () => 0, getZ: () => 0, getMaxHealth: () => 100,
            entity: { dimension: { spawnEntity: () => ({}) } }
        };

        const factory = (type as any).factory;
        if (factory) {
            for (const key of Object.getOwnPropertyNames(factory)) {
                const val = (factory as any)[key];
                if (val && typeof val === 'object' && val.isProperty) {
                    const prop = val as EntityDataAccessor<any>;
                    properties[prop.id] = {
                        type: prop.propertyType,
                        default: prop.defaultValue,
                        client_sync: prop.clientSync
                    };
                    if (prop.range) properties[prop.id].range = prop.range;
                    if (prop.values) properties[prop.id].values = prop.values;
                }
            }

            try {
                const mobInstance = new factory(entityMock);
                const sniffGoals = (selector: any) => {
                    if (selector?.getAvailableGoals) {
                        for (const wrapped of selector.getAvailableGoals()) {
                            const config = wrapped.goal.getNativeConfig();
                            if (config) Object.assign(components, config);
                        }
                    }
                };
                sniffGoals(mobInstance.goalSelector);
                sniffGoals(mobInstance.targetSelector);
            } catch (e) {}
        }

        if (type.attributes) {
            const attrs = type.attributes.getAttributes();
            if (attrs.has(Attributes.MAX_HEALTH)) {
                const val = attrs.get(Attributes.MAX_HEALTH)!;
                components["minecraft:health"] = { value: val, max: val };
            }
            if (attrs.has(Attributes.ATTACK_DAMAGE)) components["minecraft:attack"] = { damage: attrs.get(Attributes.ATTACK_DAMAGE) };
            if (attrs.has(Attributes.FOLLOW_RANGE)) components["minecraft:follow_range"] = { value: attrs.get(Attributes.FOLLOW_RANGE) };
            if (attrs.has(Attributes.KNOCKBACK_RESISTANCE)) components["minecraft:knockback_resistance"] = { value: attrs.get(Attributes.KNOCKBACK_RESISTANCE) };
        }

        if (type.xpReward !== undefined) components["minecraft:experience_reward"] = { on_death: `query.last_hit_by_player ? ${type.xpReward} : 0` };

        if (type.movementMode === MovementMode.NATIVE) {
            const speed = type.attributes?.getAttributes().get(Attributes.MOVEMENT_SPEED) || 0.25;
            components["minecraft:movement"] = { value: speed };
            components["minecraft:movement.basic"] = {};
            components["minecraft:navigation.walk"] = components["minecraft:navigation.walk"] || { can_path_over_water: true };
        } else {
            components["minecraft:movement"] = { value: 0.0 };
            components["minecraft:physics"] = {};
        }

        const componentGroups: Record<string, any> = {};
        const events: Record<string, any> = (type as any).events ? { ...(type as any).events } : {};

        if (type.spawnEvent) {
            events["minecraft:entity_spawned"] = { trigger: type.spawnEvent };
            if (!events[type.spawnEvent]) events[type.spawnEvent] = {}; 
        }
        if (type.deathEvent) {
            events["minecraft:entity_die"] = { trigger: type.deathEvent };
            if (!events[type.deathEvent]) events[type.deathEvent] = {};
        }

        for (const [stateName, stateComponents] of Object.entries(type.states)) {
            const groupName = `${namespace}:${stateName}`;
            componentGroups[groupName] = stateComponents;
            events[`${namespace}:add_${stateName}`] = { add: { component_groups: [groupName] } };
            events[`${namespace}:remove_${stateName}`] = { remove: { component_groups: [groupName] } };
        }

        const description: any = {
            identifier: id,
            is_spawnable: true,
            is_summonable: true,
            spawn_category: type.spawnCategory || "monster"
        };

        // Fix: Only add properties if they exist
        if (Object.keys(properties).length > 0) {
            description.properties = properties;
        }

        const behavior: any = {
            format_version: "1.20.80",
            "minecraft:entity": {
                description: description,
                component_groups: componentGroups,
                components: components,
                events: events
            }
        };

        this.writeJson(path.join("BP", "entities", folderPath, `${name}.json`), behavior);
    }

    private generateEntityClient(namespace: string, name: string, type: EntityType<any>, folderPath: string): void {
        const id = `${namespace}:${name}`;
        const clientData = type.clientData!;
        const factory = (type as any).factory;
        const preAnimation: string[] = clientData.scripts?.pre_animation ? [...clientData.scripts.pre_animation] : [];

        if (factory) {
            for (const key of Object.getOwnPropertyNames(factory)) {
                const val = (factory as any)[key];
                if (val?.isProperty && val.clientSync) {
                    const shortName = val.id.includes(":") ? val.id.split(":")[1] : val.id;
                    preAnimation.push(`v.${shortName} = q.property('${val.id}');`);
                }
            }
        }

        const scripts: any = {};
        if (preAnimation.length > 0) scripts.pre_animation = preAnimation;
        if (clientData.scripts?.animate && clientData.scripts.animate.length > 0) scripts.animate = clientData.scripts.animate;

        const clientEntity: any = {
            format_version: "1.10.0",
            "minecraft:client_entity": {
                description: {
                    identifier: id,
                    materials: clientData.materials || { default: "entity_alphatest" },
                    textures: clientData.textures || { default: `textures/entity/${name}/${name}` },
                    geometry: clientData.geometry || { default: `geometry.${name}` },
                    render_controllers: clientData.render_controllers || [ "controller.render.default" ]
                }
            }
        };

        if (Object.keys(scripts).length > 0) {
            clientEntity["minecraft:client_entity"].description.scripts = scripts;
        }

        if (clientData.animations && Object.keys(clientData.animations).length > 0) {
            clientEntity["minecraft:client_entity"].description.animations = clientData.animations;
        }

        this.writeJson(path.join("RP", "entity", folderPath, `${name}.entity.json`), clientEntity);
    }
}
