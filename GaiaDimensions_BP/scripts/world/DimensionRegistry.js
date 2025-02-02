import { ModDimension, level } from "./ModDimension";


ModDimension.register('gaia_dimension', {
    range: { start: { x: 100000, z: 100000 }, end: { x: 400000, z: 400000 } },
    inheritance: 'the_end'
});

const dimension = level.getDimension('gaia_dimension');
