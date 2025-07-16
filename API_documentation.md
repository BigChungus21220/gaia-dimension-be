# Minecraft Bedrock Scripting API v2.0.0 Documentation

This document provides an overview of the Minecraft Bedrock Scripting API v2.0.0, focusing on the `@minecraft/server` module.

## Table of Contents

- [World](#world)
- [Events](#events)
- [Entities](#entities)
- [Blocks](#blocks)
- [Players](#players)
- [Items](#items)
- [System](#system)

## World

The `world` object is the main entry point for interacting with the Minecraft world. It provides methods for accessing dimensions, entities, players, and more.

### Getting the World Object

The `world` object is available globally in your scripts. You can access it directly:

```javascript
import { world } from "@minecraft/server";

// Example: Get all players
const players = world.getAllPlayers();
```

### World Properties

- **`afterEvents`**: Provides access to events that fire after a change has occurred.
- **`beforeEvents`**: Provides access to events that fire before a change occurs. These events can often be canceled.
- **`broadcastClientMessage(message: string, options?: RawMessage)`**: Broadcasts a message to all clients.
- **`getAbsoluteTime()`**: Returns the absolute time of the world.
- **`getDay()`**: Returns the current day.
- **`getDimension(dimensionId: string)`**: Returns a specific dimension.
- **`getPlayers(options?: EntityQueryOptions)`**: Returns a list of players matching the given options.
- **`getTimeOfDay()`**: Returns the time of day.
- **`playMusic(trackId: string, options?: MusicOptions)`**: Plays music for all players.
- **`playSound(soundId: string, location: Vector3, options?: WorldSoundOptions)`**: Plays a sound at a specific location.
- **`queueMusic(trackId: string, options?: MusicOptions)`**: Queues music to be played.
- **`say(message: string | RawMessage, options?: SayOptions)`**: Sends a message to the chat.
- **`setAbsoluteTime(time: number)`**: Sets the absolute time of the world.
- **`setTimeOfDay(timeOfDay: number | TimeOfDay)`**: Sets the time of day.
- **`stopMusic()`**: Stops all music.

## Events

The scripting API uses an event-driven architecture. You can subscribe to events to be notified when something happens in the world.

### Subscribing to Events

To subscribe to an event, you use the `subscribe` method on the corresponding event signal.

```javascript
import { world }s from "@minecraft/server";

world.afterEvents.playerJoin.subscribe((event) => {
  console.log(`${event.playerName} has joined the server.`);
});
```

### Common World Events

- **`afterEvents.chatSend`**: Fires after a player sends a chat message.
- **`afterEvents.entityDie`**: Fires after an entity dies.
- **`afterEvents.entityHurt`**: Fires after an entity is hurt.
- **`afterEvents.entitySpawn`**: Fires after an entity spawns.
- **`afterEvents.itemUse`**: Fires after an item is used.
- **`afterEvents.playerJoin`**: Fires after a player joins the world.
- **`afterEvents.playerLeave`**: Fires after a player leaves the world.
- **`afterEvents.weatherChange`**: Fires after the weather changes.
- **`beforeEvents.chatSend`**: Fires before a player sends a chat message. Can be canceled.
- **`beforeEvents.explosion`**: Fires before an explosion occurs. Can be canceled.
- **`beforeEvents.itemUse`**: Fires before an item is used. Can be canceled.
- **`beforeEvents.playerBreakBlock`**: Fires before a player breaks a block. Can be canceled.

## Entities

Entities are any object in the world that is not a block, such as mobs, players, and items.

### Getting Entities

You can get entities using the `getEntities` method on a dimension or by using the `getPlayers` method on the `world` object.

```javascript
import { world } from "@minecraft/server";

const overworld = world.getDimension("overworld");
const entities = overworld.getEntities();
```

### Entity Properties and Methods

- **`id`**: The unique identifier of the entity.
- **`typeId`**: The type of the entity (e.g., "minecraft:creeper").
- **`location`**: The entity's current location.
- **`dimension`**: The dimension the entity is in.
- **`getComponent(componentId: string)`**: Gets a component on the entity.
- **`hasComponent(componentId: string)`**: Checks if the entity has a component.
- **`kill()`**: Kills the entity.
- **`runCommandAsync(command: string)`**: Runs a command as the entity.
- **`teleport(location: Vector3, options?: TeleportOptions)`**: Teleports the entity to a new location.

## Blocks

Blocks are the fundamental building blocks of the Minecraft world.

### Getting Blocks

You can get a block using the `getBlock` method on a dimension.

```javascript
import { world } from "@minecraft/server";

const overworld = world.getDimension("overworld");
const block = overworld.getBlock({ x: 0, y: 64, z: 0 });
```

### Block Properties and Methods

- **`typeId`**: The type of the block (e.g., "minecraft:stone").
- **`location`**: The block's location.
- **`dimension`**: The dimension the block is in.
- **`getComponent(componentId: string)`**: Gets a component on the block.
- **`hasComponent(componentId: string)`**: Checks if the block has a component.
- **`setPermutation(permutation: BlockPermutation)`**: Sets the block's permutation.
- **`setType(type: BlockType | string)`**: Sets the block's type.

## Players

Players are a special type of entity that are controlled by users.

### Getting Players

You can get all players using the `getAllPlayers` method on the `world` object, or get a specific player by name.

```javascript
import { world } from "@minecraft/server";

const players = world.getAllPlayers();
const player = world.getPlayers({ name: "PlayerName" })[0];
```

### Player Properties and Methods

- **`name`**: The player's name.
- **`getGameMode()`**: Gets the player's gamemode.
- **`getHeadLocation()`**: Gets the location of the player's head.
- **`getInventory()`**: Gets the player's inventory.
- **`getItemCooldown(itemCategory: string)`**: Gets the cooldown for a specific item category.
- **`giveItem(itemStack: ItemStack)`**: Gives an item to the player.
- **`playMusic(trackId: string, options?: MusicOptions)`**: Plays music for the player.
- **`playSound(soundId: string, options?: PlayerSoundOptions)`**: Plays a sound for the player.
- **`sendMessage(message: string | RawMessage)`**: Sends a message to the player.
- **`setGameMode(gameMode: GameMode)`**: Sets the player's gamemode.
- **`startItemCooldown(itemCategory: string, duration: number)`**: Starts an item cooldown for the player.
- **`teleport(location: Vector3, options?: TeleportOptions)`**: Teleports the player.

## Items

Items are objects that can be held by players and other entities.

### Creating Items

You can create an `ItemStack` to represent an item.

```javascript
import { ItemStack, MinecraftItemTypes } from "@minecraft/server";

const diamondSword = new ItemStack(MinecraftItemTypes.diamondSword, 1);
```

### Item Properties and Methods

- **`amount`**: The number of items in the stack.
- **`typeId`**: The type of the item.
- **`getComponent(componentId: string)`**: Gets a component on the item.
- **`hasComponent(componentId: string)`**: Checks if the item has a component.
- **`nameTag`**: The name tag of the item.
- **`setLore(lore: string[])`**: Sets the lore of the item.

## System

The `system` object provides access to system-level functionality, such as scheduling and running tasks.

### System Properties and Methods

- **`afterEvents`**: Provides access to system-level events.
- **`beforeEvents`**: Provides access to system-level events.
- **`currentTick`**: The current server tick.
- **`run(callback: () => void)`**: Runs a callback on the next tick.
- **`runInterval(callback: () => void, interval?: number)`**: Runs a callback repeatedly at a given interval.
- **`runTimeout(callback: () => void, delay?: number)`**: Runs a callback after a given delay.
- **`clearRun(runId: number)`**: Clears a scheduled run.

This is a basic overview of the API. For more detailed information, please refer to the official documentation and the `index.d.ts` file in the `@minecraft/server` package.
