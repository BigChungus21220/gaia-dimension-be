import { system } from "@minecraft/server";

/**@type {(n: number)=>Promise<void>} */
export const delay = (system as any).waitTicks.bind(system);
