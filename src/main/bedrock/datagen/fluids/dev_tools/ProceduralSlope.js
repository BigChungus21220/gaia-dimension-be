/**
 * Procedural Slope Generator
 * A helper utility to procedurally generate smooth sloped geometries in Minecraft Bedrock
 */

export function createSlope(config) {
    const { 
        identifier, 
        startHeight, 
        endHeight, 
        slices = 64, 
        addLid = true,
        bounds = [-8, -8, 8, 8],
        shape = "straight" // "straight" or "diagonal"
    } = config;

    const minX = bounds[0];
    const minZ = bounds[1];
    const maxX = bounds[2];
    const maxZ = bounds[3];

    const blockWidth = maxX - minX;
    const blockDepth = maxZ - minZ;
    
    let bones = [];
    const heightDiff = startHeight - endHeight;

    if (shape === "straight") {
        let cubes = [];
        const sliceDepth = blockDepth / slices;
        
        if (addLid) {
            const angleRad = Math.atan(heightDiff / blockDepth);
            const angleDeg = angleRad * (180 / Math.PI);
            const lidLength = Math.sqrt(blockDepth * blockDepth + heightDiff * heightDiff);

            cubes.push({
                origin: [minX, startHeight, minZ],
                size: [blockWidth, 0, parseFloat(lidLength.toFixed(4))],
                pivot: [minX, startHeight, minZ],
                rotation: [-parseFloat(angleDeg.toFixed(4)), 0, 0],
                uv: {
                    up: { uv: [0, 0], uv_size: [blockWidth, blockDepth], uv_rotation: 180 },
                    down: { uv: [0, 0], uv_size: [blockWidth, blockDepth] }
                }
            });
        }

        for (let i = 0; i < slices; i++) {
            let zStart = minZ + (i * sliceDepth);
            let zEnd = zStart + sliceDepth;
            let hEnd = startHeight - ((zEnd - minZ) / blockDepth) * heightDiff;
            
            if (hEnd < Math.min(startHeight, endHeight)) hEnd = Math.min(startHeight, endHeight);
            if (hEnd > Math.max(startHeight, endHeight)) hEnd = Math.max(startHeight, endHeight);

            let uvVStart = ((zStart - minZ) / blockDepth) * blockDepth;
            let uvVWidth = sliceDepth;

            let sliceUv = {
                east:  { uv: [parseFloat(uvVStart.toFixed(4)), parseFloat((blockDepth - hEnd).toFixed(4))], uv_size: [parseFloat(uvVWidth.toFixed(4)), parseFloat(hEnd.toFixed(4))] },
                west:  { uv: [parseFloat(uvVStart.toFixed(4)), parseFloat((blockDepth - hEnd).toFixed(4))], uv_size: [parseFloat(uvVWidth.toFixed(4)), parseFloat(hEnd.toFixed(4))] }
            };

            if (i === 0) sliceUv.north = { uv: [0, blockDepth - hEnd], uv_size: [blockWidth, hEnd] };
            if (i === slices - 1) sliceUv.south = { uv: [0, blockDepth - hEnd], uv_size: [blockWidth, hEnd] };

            cubes.push({
                origin: [minX, 0, parseFloat(zStart.toFixed(4))],
                size: [blockWidth, parseFloat(hEnd.toFixed(4)), parseFloat(sliceDepth.toFixed(4))],
                uv: sliceUv
            });
        }

        bones.push({
            name: "fluid",
            pivot: [0, 0, 0],
            cubes: cubes
        });

    } else if (shape === "diagonal") {
        let cubes = [];
        const gridSize = slices; 
        const pillarWidth = blockWidth / gridSize;
        const pillarDepth = blockDepth / gridSize;
        const deltaH = (startHeight - endHeight) / 2;

        if (addLid) {
            const rotX = -Math.asin(deltaH / blockDepth) * 180 / Math.PI;
            const rotZ = Math.asin(deltaH / blockWidth) * 180 / Math.PI;
            
            const depthHypot = Math.sqrt(blockDepth * blockDepth + deltaH * deltaH);
            const widthHypot = Math.sqrt(blockWidth * blockWidth + deltaH * deltaH);

            bones.push({
                name: "diagonal_lid",
                pivot: [minX, startHeight, minZ],
                rotation: [parseFloat(rotX.toFixed(4)), 0, parseFloat(rotZ.toFixed(4))],
                cubes: [
                    {
                        origin: [minX, startHeight, minZ],
                        size: [parseFloat(widthHypot.toFixed(4)), 0, parseFloat(depthHypot.toFixed(4))],
                        pivot: [minX, startHeight, minZ],
                        rotation: [0, 0, 0],
                        uv: {
                            up: { uv: [0, 0], uv_size: [blockWidth, blockDepth], uv_rotation: 180 },
                            down: { uv: [0, 0], uv_size: [blockWidth, blockDepth] }
                        }
                    }
                ]
            });
        }

        const uvUnit = 16 / gridSize;

        for (let ix = 0; ix < gridSize; ix++) {
            for (let iz = 0; iz < gridSize; iz++) {
                if (ix !== 0 && ix !== gridSize - 1 && iz !== 0 && iz !== gridSize - 1) continue;

                let xStart = minX + (ix * pillarWidth);
                let zStart = minZ + (iz * pillarDepth);
                
                let cx = xStart + 0.5 * pillarWidth;
                let cz = zStart + 0.5 * pillarDepth;
                
                let height = startHeight - ((cx - minX) / blockWidth) * deltaH - ((cz - minZ) / blockDepth) * deltaH;
                if (height < endHeight) height = endHeight;

                let uvXStart = ix * uvUnit;
                let uvZStart = iz * uvUnit;

                let pillarUv = {};

                if (!addLid) {
                    pillarUv.up = { uv: [parseFloat(uvXStart.toFixed(4)), parseFloat(uvZStart.toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(uvUnit.toFixed(4))] };
                    pillarUv.down = { uv: [parseFloat(uvXStart.toFixed(4)), parseFloat(uvZStart.toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(uvUnit.toFixed(4))] };
                }

                // FLIPPING EAST-WEST AS DEMANDED
                if (ix === 0) {
                    pillarUv.east = { uv: [parseFloat(uvZStart.toFixed(4)), parseFloat((16 - height).toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(height.toFixed(4))] };
                }
                if (ix === gridSize - 1) {
                    pillarUv.west = { uv: [parseFloat(uvZStart.toFixed(4)), parseFloat((16 - height).toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(height.toFixed(4))] };
                }
                if (iz === gridSize - 1) {
                    pillarUv.south = { uv: [parseFloat(uvXStart.toFixed(4)), parseFloat((16 - height).toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(height.toFixed(4))] };
                }
                if (iz === 0) {
                    pillarUv.north = { uv: [parseFloat(uvXStart.toFixed(4)), parseFloat((16 - height).toFixed(4))], uv_size: [parseFloat(uvUnit.toFixed(4)), parseFloat(height.toFixed(4))] };
                }

                if (Object.keys(pillarUv).length > 0) {
                    cubes.push({
                        origin: [parseFloat(xStart.toFixed(4)), 0, parseFloat(zStart.toFixed(4))],
                        size: [parseFloat(pillarWidth.toFixed(4)), parseFloat(height.toFixed(4)), parseFloat(pillarDepth.toFixed(4))],
                        uv: pillarUv
                    });
                }
            }
        }

        bones.push({
            name: "fluid_pillars",
            pivot: [0, 0, 0],
            cubes: cubes
        });
    }

    return {
        format_version: "1.21.0",
        "minecraft:geometry": [
            {
                description: {
                    identifier: identifier,
                    texture_width: 16,
                    texture_height: 16,
                    visible_bounds_width: 4,
                    visible_bounds_height: 3,
                    visible_bounds_offset: [0, 0.5, 0]
                },
                bones: bones
            }
        ]
    };
}
