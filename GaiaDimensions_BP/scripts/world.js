import './geyser.js';
import './clearMobs.js';
import './portal.js';
import './light_portal.js';
import './APIAdditions.js';
import {Gaia} from './api/Dimension.js'
import {furnacesLoad} from "./api/furnaceAPI.js";
const gaia = new Gaia();
export default gaia
furnacesLoad()

