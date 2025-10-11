import { MolangVariableMap } from "@minecraft/server";

class LeavesComponent {
    constructor() {
        this.onRandomTick = this.onRandomTick.bind(this);
    }

    onRandomTick(event) {
        const { block, dimension } = event;
        dimension.spawnParticle(block.typeId, block.center(), new MolangVariableMap());
    }
}

export function registerLeavesComponent({ blockComponentRegistry }) {
    blockComponentRegistry.registerCustomComponent("gaiadimension:leaves", new LeavesComponent());
}