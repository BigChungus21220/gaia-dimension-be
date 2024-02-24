import {world, system, ItemStack, EnchantmentTypes} from '@minecraft/server'

const forbiddentItems = ["shulker"]

system.beforeEvents.watchdogTerminate.subscribe((eventData)=>{
    eventData.cancel = true
})

system.runTimeout(()=>{
    system.runInterval(()=>{
        let allPlayers = world.getAllPlayers()

        //Item Changing Event
        for(let player of allPlayers){
            let currentHeldItemStatusProperty = player.getDynamicProperty(`playerHeldItemStatus`)
            let currentPropertyJson
            let inventory = player.getComponent("inventory").container
            let selectedSlot = player.selectedSlot
            let itemHolding = inventory.getItem(selectedSlot)
            let propertyInterface = {item:undefined, slot:undefined, id:undefined}
            let changed = false

            if(itemHolding){
                propertyInterface.item = itemHolding.typeId
                if(itemHolding.getLore().length>0){
                    propertyInterface.id = itemHolding.getLore()[0]
                }
            }
            propertyInterface.slot = selectedSlot
            //world.sendMessage(`${currentHeldItemStatusProperty} -- ${JSON.stringify(propertyInterface)}`)
            if(currentHeldItemStatusProperty != undefined){
                if(JSON.stringify(propertyInterface) != currentHeldItemStatusProperty){
                    currentPropertyJson = JSON.parse(currentHeldItemStatusProperty)
                    if(currentPropertyJson.slot != selectedSlot) {
                        changed = true
                    }
                    if(itemHolding){
                        if(currentPropertyJson.item != itemHolding.typeId){
                            changed = true
                        }                    
                    }else{
                        if(currentPropertyJson.item != undefined){
                            changed = true
                        }
                        if(currentPropertyJson.item == undefined && itemHolding == undefined){
                            changed = false
                        }
                    }
                    if(changed){
                        //player.sendMessage(`Item Changed - ${JSON.stringify(propertyInterface)}`)
                        onChanged(player, inventory, propertyInterface, currentPropertyJson)
                        player.setDynamicProperty(`playerHeldItemStatus`,JSON.stringify(propertyInterface))
                    }else{
                        player.setDynamicProperty(`playerHeldItemStatus`,JSON.stringify(propertyInterface))
                    }
                }
            }else{
                player.setDynamicProperty(`playerHeldItemStatus`,JSON.stringify(propertyInterface))
            }
            
            //Teleport Pouch Entity to Player
            if(itemHolding != undefined){
                if(itemHolding.typeId.includes("gaia:gem_pouch")){
                    if(propertyInterface.id != undefined){
                        let pouchEntityQuery = {tags:[propertyInterface.id]}
                        let pouchEntities = player.dimension.getEntities(pouchEntityQuery)
                        for(let pouchEntity of pouchEntities){
                            let newLocation = player.location
                            newLocation.y = newLocation.y+1.5
                            pouchEntity.teleport(newLocation)
                        }
                    }
                }
            }                      
        }

        //Record Items When Pouch Close
        let pouchCloseQuery = {tags:["close"]}
        let pouchCloseEntities = getPouchEntity(pouchCloseQuery)
        for(let pouchEntity of pouchCloseEntities){           
            let pouchEntityInventory = pouchEntity.getComponent("inventory").container
            let lore = recordItems(gaiaEntity.getTags()[0], pouchEntityInventory, pouchEntity)
            let playerQuery = {type:"minecraft:player", closest:1, location:pouchEntity.location}
            let playerEntity = pouchEntity.dimension.getEntities(playerQuery)
            for(let player of playerEntity){
                let inventory = player.getComponent("inventory").container
                let item = inventory.getItem(player.selectedSlot)
                if(!item) continue               
                if(item.getLore()[0] != pouchEntity.getTags()[0]) continue
                item.setLore(lore)
                inventory.setItem(player.selectedSlot, item)
            }
            pouchEntity.removeTag("close")
        }
    },1)

    //Manage Inactive Backpacks
    system.runInterval(()=>{
        let pouchEntities = getGemstonePouchEntity({families:["pouch"]})
        for(let pouchEntity of pouchEntities){
            let playerQuery = {type:"minecraft:player", location:pouchEntity.location, maxDistance:3}
            let players = pouchEntity.dimension.getEntities(playerQuery)
            let newLocation = pouchEntity.location
            newLocation.y = -64
            if(players.length==0){
                pouchEntity.teleport(newLocation)
            }
        }
    },60)
},60)

function onChanged(player, playerInventory, propertyDataCurrent, propertyDataOld){
    let currentItem = playerInventory.getItem(propertyDataCurrent.slot) 

    if(currentItem != undefined){
        if(currentItem.typeId.includes("gaia:gem_pouch")){
            let lore = currentItem.getLore()            
            if(lore.length == 0){ //Create New Pouch ID
                let pouchId = `gempouch_id:${Math.floor(Math.random() * 9999)}`
                currentItem.setLore([pouchId])
                playerInventory.setItem(propertyDataCurrent.slot, currentItem)
                let pouchEntity = player.dimension.spawnEntity("gaia:gem_pouch_container", player.location)
                pouchEntity.triggerEvent(pouchType(currentItem))
                pouchEntity.addTag(bpId)
                pouchEntity.nameTag = pouchName(currentItem)
            }else{ //Open Old Pouch
                let pouchEntityQuery = {tags:[`${propertyDataOld.id}`]}
                let bpEntities = player.dimension.getEntities(pouchEntityQuery)
                for(let pouchEntity of bpEntities){
                    closePouch(pouchEntity, player, propertyDataOld)
                }
                openPouch(player, currentItem)               
            }
        }else{                     
            let pouchEntityQuery = {tags:[`${propertyDataOld.id}`]}
            let pouchEntities = player.dimension.getEntities(pouchEntityQuery)
            for(let pouchEntity of pouchEntities){
                let pouchEntityInv = pouchEntity.getComponent("inventory").container
                for(let slot=0; slot<pouchEntityInv.size; slot++){
                    let item = pouchEntityInv.getItem(slot)
                    if(!item) continue
                    if(forbiddentItems.find((itemName) => item.typeId.includes(itemName))){
                        pouchEntity.dimension.spawnItem(item, pouchEntity.location)
                        pouchEntityInv.setItem(slot, undefined)
                    }
                }
                closePouch(pouchEntity, player, propertyDataOld)
            }
        }
    }else{
        if(propertyDataOld.id != undefined){
            let pouchEntityQuery = {tags:[`${propertyDataOld.id}`]}
            let pouchEntities = player.dimension.getEntities(pouchEntityQuery)
            for(let pouchEntity of pouchEntities){
                let pouchEntityInv = pouchEntity.getComponent("inventory").container
                for(let slot=0; slot<pouchEntityInv.size; slot++){
                    let item = pouchEntityInv.getItem(slot)
                    if(!item) continue
                    if(forbiddentItems.find((itemName) => item.typeId.includes(itemName))){
                        pouchEntity.dimension.spawnItem(item, pouchEntity.location)
                        pouchEntityInv.setItem(slot, undefined)
                    }
                }
                closePouch(pouchEntity, player, propertyDataOld)      
            }
        }
    }   
}

function closePouch(pouchEntity, player, propertyDataOld){
    let newLocation = pouchEntity.location
    newLocation.y = -64
    pouchEntity.teleport(newLocation)
    let pouchOldEntityQuery = {tags:[`${propertyDataOld.id}`]}
    let pouchOldEntity = player.dimension.getEntities(pouchOldEntityQuery)   
    let newLore = []
    for(let pouchOldEntities of pouchOldEntity){                     
        let pouchOldInventory = pouchOldEntities.getComponent("inventory").container
        newLore = recordItems(propertyDataOld.id, pouchOldInventory)
    }
    let playerHeldItem = player.getComponent("inventory").container.getItem(propertyDataOld.slot)
    playerHeldItem.setLore(newLore)
    player.getComponent("inventory").container.setItem(propertyDataOld.slot, playerHeldItem)
}

function recordItems(id, inventory, pouchEntity){    
    let count = 0;
    let countOverflow = 0
    let backupItemList = []
    let lore = [`${id}`]
    for(let slot=0; slot<inventory.size; slot++){        
        let item = inventory.getItem(slot)
        if(!item) continue
        if(forbiddentItems.find((itemName) => item.typeId.includes(itemName))){
            pouchEntity.dimension.spawnItem(item, pouchEntity.location)
            inventory.setItem(slot, undefined)
            continue
        }
        backupItemList.push(getItemProperties(item))
        let itemName = ""
        let itemNameArray = item.typeId.split(":")[1].split("_")
        for(let itemStr of itemNameArray){
            itemName +=  itemStr.charAt(0).toUpperCase() + itemStr.slice(1) + " ";
        }
        if(count < 5){
            lore.push(`§7${itemName}x${item.amount}`)     
        }else{
            countOverflow++
        }       
        count++        
    }
    if(countOverflow>0){
        lore.push(`§7and ${countOverflow} more...`)
    }
    world.setDynamicProperty(`${id}`, JSON.stringify(backupItemList))
    world.sendMessage(`${world.getDynamicPropertyTotalByteCount()}`)
    world.sendMessage(world.getDynamicProperty(`${id}`))
    return lore
}

function getItemProperties(item){
    let itemInterface = {id:undefined, name:undefined, amount:undefined, lore:undefined, durability:undefined, enchant:undefined}
    let enchantList = Enchantments.getEnchants(item)
    let enchantArray = []
    itemInterface.id = item.typeId
    itemInterface.amount = item.amount
    if(item.hasComponent("durability")){
        itemInterface.durability = item.getComponent("durability").damage
    }   
    if(item.nameTag) itemInterface.name = item.nameTag
    if(item.getLore().length > 0) itemInterface.lore = item.getLore()
    if(enchantList.length>0){
        for(let enchant of enchantList){
            let enchantInterface = {enchantName:undefined,level:undefined}
            enchantInterface.enchantName = enchant.type.id
            enchantInterface.level = enchant.level
            enchantArray.push(enchantInterface)
        }
    itemInterface.enchant = enchantArray
    }
    return itemInterface
}

