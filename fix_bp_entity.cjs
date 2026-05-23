const fs = require('fs');
const path = require('path');

const controllerPath = 'src/main/bedrock/data/animation_controllers/malachite_guard.animation_controllers.json';
const entityPath = 'src/main/bedrock/data/entities/gaia_mobs/malachite_guard.json';

function fixBPEntity() {
    if (!fs.existsSync(controllerPath)) {
        console.error('Cannot find controller path:', controllerPath);
        return;
    }
    if (!fs.existsSync(entityPath)) {
        console.error('Cannot find entity path:', entityPath);
        return;
    }

    const controllerData = JSON.parse(fs.readFileSync(controllerPath, 'utf-8'));
    const animationsNeeded = new Set();

    if (controllerData.animation_controllers) {
        for (const [ctrlKey, ctrlObj] of Object.entries(controllerData.animation_controllers)) {
            if (ctrlObj.states) {
                for (const [stateKey, stateObj] of Object.entries(ctrlObj.states)) {
                    if (stateObj.animations) {
                        for (const anim of stateObj.animations) {
                            if (typeof anim === 'string') {
                                animationsNeeded.add(anim);
                            } else if (typeof anim === 'object') {
                                for (const key in anim) {
                                    animationsNeeded.add(key);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    const entityData = JSON.parse(fs.readFileSync(entityPath, 'utf-8'));
    const desc = entityData["minecraft:entity"].description;
    
    if (!desc.animations) {
        desc.animations = {};
    }

    let changed = false;
    for (const anim of animationsNeeded) {
        if (!desc.animations[anim]) {
            console.log(`Adding dummy animation for missing: ${anim}`);
            desc.animations[anim] = "animation.dummy";
            changed = true;
        }
    }

    if (changed) {
        fs.writeFileSync(entityPath, JSON.stringify(entityData, null, 2) + "\n");
        console.log('Successfully updated the BP entity with dummy animations.');
    } else {
        console.log('No missing animations to add.');
    }
}

fixBPEntity();
