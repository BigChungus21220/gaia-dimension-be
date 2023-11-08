import './geyser.js';
import './clearMobs.js';
import './portal.js';
import './light_portal.js';
import './APIAdditions.js';
import {furnacesLoad} from "./api/furnaceAPI.js";
import { Gaia } from './api/Dimension.js';
furnacesLoad()
const gaia = new Gaia()
export default gaia