export function generateFluidIDs(baseName: string): string[] {
    // 1:1 Burnt: all fluids have exactly 3 flowing stages
    return [
        baseName,
        baseName + "_down",
        baseName + "1",
        baseName + "2",
        baseName + "3"
    ];
}
