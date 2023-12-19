import './geyser.js';
import './clearMobs.js';
import './portal.js';
import './light_portal.js';
import './APIAdditions.js';
import "./blocks/place.js";
import {Gaia} from './api/Dimension.js'
import {furnacesLoad} from "./api/furnaceAPI.js";
const gaia = new Gaia();
gaia.pushFog()
export default gaia
furnacesLoad()

