import { FluidTemplate } from "./lib/FluidTemplate.js";
import { Entity, Player } from "@minecraft/server";

const ENTITY_EFFECT_QUERY_RADIUS = 32;
const ENTITY_EFFECT_CLUSTER_JOIN_RADIUS = 32;
const ENTITY_EFFECT_CLUSTER_FETCH_RADIUS = ENTITY_EFFECT_QUERY_RADIUS + ENTITY_EFFECT_CLUSTER_JOIN_RADIUS;

type EntityEffectCluster = {
    dimensionId: string;
    dimension: Player["dimension"];
    anchor: Player["location"];
};

const distanceSquared = (left: Player["location"], right: Player["location"]) => {
    const dx = left.x - right.x;
    const dy = left.y - right.y;
    const dz = left.z - right.z;
    return (dx * dx) + (dy * dy) + (dz * dz);
};

const buildEntityEffectClusters = (players: Player[]) => {
    const clusters: EntityEffectCluster[] = [];
    const maxJoinDistanceSquared = ENTITY_EFFECT_CLUSTER_JOIN_RADIUS * ENTITY_EFFECT_CLUSTER_JOIN_RADIUS;

    for (const player of players) {
        if (!player?.isValid) continue;

        let matchedCluster: EntityEffectCluster | undefined;
        for (const cluster of clusters) {
            if (cluster.dimensionId !== player.dimension.id) continue;
            if (distanceSquared(cluster.anchor, player.location) > maxJoinDistanceSquared) continue;

            matchedCluster = cluster;
            break;
        }

        if (!matchedCluster) {
            clusters.push({
                dimensionId: player.dimension.id,
                dimension: player.dimension,
                anchor: { ...player.location },
            });
        }
    }

    return clusters;
};

export function runEntityEffects(
    idToTemplate: Map<string, FluidTemplate>, 
    fluidIDs: Set<string>,
    players: Player[]
) {
    if (players.length === 0) return;

    const entitiesToProcess = new Set<Entity>();

    for (const cluster of buildEntityEffectClusters(players)) {
        const entities = cluster.dimension.getEntities({
            location: cluster.anchor,
            maxDistance: ENTITY_EFFECT_CLUSTER_FETCH_RADIUS,
            excludeFamilies: [ "inanimate" ] 
        });

        for (const entity of entities) {
            if (entity.typeId === "minecraft:player") continue;
            entitiesToProcess.add(entity);
        }
    }

    for (const entity of entitiesToProcess) {
        try {
            const dimension = entity.dimension;
            const location = entity.location;
            const blockAt = dimension.getBlock(location);
            const blockTypeId = blockAt?.typeId;

            if (blockAt && blockTypeId && fluidIDs.has(blockTypeId)) {
                const template = idToTemplate.get(blockTypeId);
                if (template && template.onEntityTick) {
                    template.onEntityTick(entity, blockAt);
                }
            }
        } catch (e) {}
    }
}
