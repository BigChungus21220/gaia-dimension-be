import { CustomDimension } from "./ModDimension";


const level = new Level();
ModDimension.register('custom_dimension', {
    range: { start: { x: 0, z: 0 }, end: { x: 100, z: 100 } },
    inheritance: 'overworld'
});

const dimension = level.getDimension('custom_dimension');
console.log(dimension);