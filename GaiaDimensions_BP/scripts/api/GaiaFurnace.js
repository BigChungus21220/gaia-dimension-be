import * as Events from "./Events"
import { world } from "@minecraft/server";
import { InventoryBlock } from "./InventoryBlock";
import { gaia_furnace_recipes } from "./furnace_data/gaia_furnace_recipes";
import { gaia_furnace_fuels } from "./furnace_data/gaia_furnace_fuel";

const furnaces = [
    {blockIdentifier: 'gaia:purifier', entityIdentifier: 'gaia:purifier_container', entityName: 'purifier_ui'},
    {blockIdentifier: 'gaia:restructurer', entityIdentifier: 'gaia:restructer_container', entityName: 'restructer_ui'},
    {blockIdentifier: 'gaia:gaia_furnace', entityIdentifier: 'gaia:furnace_entity', entityName: 'gaia_furnace'}
];

Events.inventoryBlockPlaced.subscribe((eventData) => {
    for (const furnace of furnaces){
        if (furnace.blockIdentifier === eventData.block.typeId){
            const fb = new Furnace(eventData.block);
            break;
        }
    }
})

Events.inventoryBlockBroken.subscribe((eventData) => {
    
})

export class Furnace extends InventoryBlock {
    
    constructor(InventoryBlock){
        
    }

    update(){
        world.sendMessage("ran");
        if (this.burn_timer > 0){
            this.burn_timer --;
            if (!this.lit){
                this.lit = true;
            }
        } else if (this.fuelStack.amount > 0 && (this.outputStack == undefined || this.outputStack.typeId == this.inputstack.typeId)){
            this.fuelStack.amount --;
            this.burn_timer = gaia_furnace_fuels[this.fuelStack.typeId];
        } else {
            if (this.lit){
                this.lit = false;
            }
        }

        if (this.cook_timer > 0){
            if (this.inputStack.amount > 0){
                this.cook_timer --;
            } else {
                this.cook_timer += 2;
            }
        } else {
            if (this.outputStack == undefined || this.outputStack.typeId == gaia_furnace_recipes(this.inputstack.typeId).output){
                this.outputStack.addItem();
                this.burn_timer = 6;
            }
        }
    }

    get container(){
        return this.entity.getComponent("minecraft:inventory").container;
    }

    get fuelStack(){
        return this.container.getItem(1);
    }

    set fuelStack(stack){
        this.container.setItem(1,stack);
    }

    get inputStack(){
        return this.container.getItem(0);
    }

    set inputStack(stack){
        this.container.setItem(0,stack);
    }

    get outputStack(){
        return this.container.getItem(2);
    }

    set outputStack(stack){
        this.container.setItem(2,stack);
    }

    get cook_timer(){
        return this.entity.getProperty("gaia:cook_timer");
    }

    set cook_timer(cook_time){
        this.entity.setProperty("gaia:cook_timer", cook_time);
    }

    get burn_timer(){
        return this.entity.getProperty("gaia:burn_timer");
    }

    set burn_timer(burn_time){
        this.entity.setProperty("gaia:burn_timer", burn_time);
    }

    get lit(){
        return this.block.permutation.getState("gaia:lit");
    }

    set lit(is_lit){
        this.block.setPermutation(this.block.permutation.withState("gaia:lit", is_lit));
    }

}