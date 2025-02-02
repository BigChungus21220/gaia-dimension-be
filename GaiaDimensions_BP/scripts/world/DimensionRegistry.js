import { CustomDimension } from "./Dimension";

CustomDimension.register('custom_overworld', {
    range: {
        start: { x: 75000, z: -1 },  
        end: { x: 100000, z: 1 }     
    },
    parentDimension: 'the_end'
});