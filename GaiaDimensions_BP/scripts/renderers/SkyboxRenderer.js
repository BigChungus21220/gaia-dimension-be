import {world , system } from '@minecraft/server';
import * as Events from '../world/Events'
import Gaia from '../world/Gaia'
import {vec3} from './vec3.js'

class SkyboxRenderer {
    constructor(player) {
        this.tick()
    }

    /**
     * @param {PLayer} player
     */

Events.playerChangeBlock.subscribe((eventData)) => { 