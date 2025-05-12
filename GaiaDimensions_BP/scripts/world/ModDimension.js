import { world, system } from "@minecraft/server";

// Storage for registered virtual dimensions
const ALL_MOD_DIMENSIONS = {};

/**
 * Represents a virtual mod dimension, bounded by a box within an existing world dimension.
 * Allows for interactions with entities, players, and blocks within this virtual dimension.
 */
export class ModDimension {
  /**
   * Creates an instance of a ModDimension.
   * @param {Object} opts - The options for the dimension.
   * @param {string} opts.id - The unique identifier for this dimension.
   * @param {Object} opts.range - The bounding range of the dimension with `start` and `end` points.
   * @param {string} opts.inheritance - The parent dimension that this virtual dimension inherits from.
   */
  constructor({ id, range, inheritance }) {
    this.id = id;
    this.range = range;
    this.bounds = { min: range.start, max: range.end };
    this.center = {
      x: (range.start.x + range.end.x) / 2,
      z: (range.start.z + range.end.z) / 2
    };
    // Get the world dimension from which this virtual dimension is derived
    this.dimension = world.getDimension(inheritance);
    this.eventsHandler = new DimensionEvents(this);
  }

  /**
   * Gets the center coordinates of the dimension.
   * @returns {Object} The center of the dimension with `x` and `z` coordinates.
   */
  getCenter() {
    return { ...this.center };
  }

  /**
   * Checks if a given location is inside the bounds of this dimension.
   * @param {Object} loc - The location to check.
   * @param {number} loc.x - The x-coordinate.
   * @param {number} loc.z - The z-coordinate.
   * @returns {boolean} True if the location is within bounds, otherwise false.
   */
  isInDimension(loc) {
    return (
      loc.x >= this.range.start.x && loc.x <= this.range.end.x &&
      loc.z >= this.range.start.z && loc.z <= this.range.end.z
    );
  }

  /**
   * Retrieves all entities within the dimension that satisfy a given query.
   * @param {Object} query - The query to filter entities.
   * @returns {Array} A list of entities that satisfy the query.
   */
  getEntities(query) {
    return this.dimension.getEntities(query)
      .filter(e => this.isInDimension(e.location));
  }

  /**
   * Retrieves all players within the dimension that satisfy a given query.
   * @param {Object} query - The query to filter players.
   * @returns {Array} A list of players that satisfy the query.
   */
  getPlayers(query) {
    return this.dimension.getPlayers(query)
      .filter(p => this.isInDimension(p.location));
  }

  /**
   * Checks if a position is within the defined bounds of the dimension.
   * @param {Object} pos - The position to check.
   * @param {number} pos.x - The x-coordinate.
   * @param {number} pos.y - The y-coordinate.
   * @param {number} pos.z - The z-coordinate.
   * @returns {boolean} True if the position is within bounds, otherwise false.
   */
  isWithinBounds(pos) {
    return (
      pos.x >= this.bounds.min.x && pos.x <= this.bounds.max.x &&
      pos.y >= this.bounds.min.y && pos.y <= this.bounds.max.y &&
      pos.z >= this.bounds.min.z && pos.z <= this.bounds.max.z
    );
  }

  /**
   * Gets the block at a specified position within the dimension.
   * Throws an error if the position is out of bounds.
   * @param {Object} pos - The position of the block to retrieve.
   * @returns {Block} The block at the given position.
   */
  getBlock(pos) {
    if (!this.isWithinBounds(pos)) {
      throw new Error(`Position ${JSON.stringify(pos)} outside bounds of virtual dimension '${this.id}'`);
    }
    return this.dimension.getBlock(pos);
  }

  /**
   * Offsets a location relative to the center of this dimension.
   * @param {Object} loc - The location to offset.
   * @returns {Object} The offset location with `x`, `y`, and `z` coordinates.
   */
  offset(loc) {
    return {
      x: loc.x - this.center.x,
      y: loc.y,
      z: loc.z - this.center.z
    };
  }

  /**
   * Registers a new virtual dimension.
   * @param {string} id - The unique identifier for the virtual dimension.
   * @param {Object} opts - Options for the virtual dimension.
   * @param {Object} opts.range - The bounding range of the dimension.
   * @param {string} opts.inheritance - The parent dimension this virtual dimension inherits from.
   * @returns {ModDimension} The created ModDimension instance.
   */
  static register(id, opts = {}) {
    if (ALL_MOD_DIMENSIONS[id]) {
      throw new Error(`Virtual dimension '${id}' is already registered`);
    }
    const range = opts.range || { start: { x: -1, y: 0, z: -1 }, end: { x: 1, y: 256, z: 1 } };
    const inheritance = opts.inheritance || "the_end";
    ALL_MOD_DIMENSIONS[id] = new ModDimension({ id, range, inheritance });
    return ALL_MOD_DIMENSIONS[id];
  }

  /**
   * Retrieves a registered virtual dimension by its ID.
   * @param {string} id - The unique identifier of the dimension.
   * @returns {ModDimension} The ModDimension instance.
   */
  static get(id) {
    return ALL_MOD_DIMENSIONS[id];
  }

  /**
   * Retrieves all registered virtual dimensions.
   * @returns {Array} An array of all registered ModDimension instances.
   */
  static getAll() {
    return Object.values(ALL_MOD_DIMENSIONS);
  }
}

/**
 * Handles onJoin/onLeave events for a ModDimension, allowing for event registration and triggers.
 */
class DimensionEvents {
  /**
   * Creates an event handler for ModDimension.
   * @param {ModDimension} modDim - The ModDimension instance.
   */
  constructor(modDim) {
    this.modDim = modDim;
    this.players = {};
    this.events = {};
    system.runInterval(() => this._tick(), 20);
  }

  /**
   * Periodically checks for player joins and leaves in the dimension.
   */
  _tick() {
    const current = this.modDim.getPlayers();
    const currentIds = new Set(current.map(p => p.id));
    // Detect players who have left
    for (const id in this.players) {
      if (!currentIds.has(id)) {
        const player = this.players[id];
        delete this.players[id];
        system.runTimeout(() => this.triggerEvent('onLeave', player), 1);
      }
    }
    // Detect players who have joined
    for (const player of current) {
      if (!this.players[player.id]) {
        this.players[player.id] = player;
        system.runTimeout(() => this.triggerEvent('onJoin', player), 1);
      }
    }
  }

  /**
   * Adds an event listener to the event handler.
   * @param {string} id - The unique event ID.
   * @param {string} type - The event type (`onJoin` or `onLeave`).
   * @param {function} callback - The callback function to invoke when the event occurs.
   * @returns {Object} The registered event object.
   */
  addEvent(id, type, callback) {
    if (this.events[id]) {
      throw new Error(`Event id '${id}' already registered`);
    }
    this.events[id] = { type, callback };
    return this.events[id];
  }

  /**
   * Removes an event listener by its event ID.
   * @param {string} id - The event ID to remove.
   */
  removeEvent(id) {
    delete this.events[id];
  }

  /**
   * Registers a `onJoin` event for when a player enters the dimension.
   * @param {string} id - The event ID.
   * @param {function} callback - The callback to run when the event occurs.
   * @returns {Object} The registered event object.
   */
  onJoin(id, callback) {
    return this.addEvent(id, 'onJoin', callback);
  }

  /**
   * Registers a `onLeave` event for when a player leaves the dimension.
   * @param {string} id - The event ID.
   * @param {function} callback - The callback to run when the event occurs.
   * @returns {Object} The registered event object.
   */
  onLeave(id, callback) {
    return this.addEvent(id, 'onLeave', callback);
  }

  /**
   * Triggers the registered event callbacks for a given event type.
   * @param {string} type - The event type (`onJoin` or `onLeave`).
   * @param {Player} player - The player who triggered the event.
   */
  triggerEvent(type, player) {
    for (const ev of Object.values(this.events)) {
      if (ev.type === type) {
        ev.callback(player);
      }
    }
  }
}

/**
 * Provides a simple interface to retrieve virtual dimensions
 */
export class Level {
  /**
   * Retrieves a ModDimension by its ID.
   * @param {string} id - The ID of the dimension.
   * @returns {ModDimension} The requested ModDimension instance.
   */
  getDimension(id) {
    return ModDimension.get(id);
  }

  /**
   * Retrieves all registered ModDimensions.
   * @returns {Array} An array of all registered ModDimension instances.
   */
  getAllDimensions() {
    return ModDimension.getAll();
  }
}

// Export a singleton level manager for easy access
export const level = new Level();
