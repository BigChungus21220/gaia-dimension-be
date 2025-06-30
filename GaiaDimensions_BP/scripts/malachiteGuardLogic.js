import { world, system } from "@minecraft/server";
import Gaia from "./world/Gaia";
import { vec3 } from "./Vec3";
import * as Events from "./world/Events";

const GAIA_DIMENSION = world.getDimension("the_end");

export const mgDefendEvent = new Events.GaiaEvent();
export const noMgDefendEvent = new Events.GaiaEvent();

export function runMalachiteGuardLogic() {
    const scoreboard = world.scoreboard;
    let mgDefendObjective = scoreboard.getObjective("mg_defend");

    if (!mgDefendObjective) {
        mgDefendObjective = scoreboard.addObjective("mg_defend", "dummy");
    }

    const malachiteGuards = Gaia.getEntities({ type: "gaia:malachite_guard" });

    for (const guard of malachiteGuards) {
        const participant = mgDefendObjective.getParticipants().find(p => p.displayName === guard.id);

        let currentScore = 0;
        if (participant) {
            currentScore = mgDefendObjective.getScore(participant);
        } else {
            mgDefendObjective.setScore(guard.id, 0);
        }

        if (currentScore >= 1) {
            mgDefendObjective.setScore(guard.id, currentScore - 1);
        }

        if (currentScore >= 5) {
            mgDefendEvent.trigger({ entity: guard });
            guard.addTag("mg_defend");
        } else if (currentScore <= 4 && guard.hasTag("mg_defend")) {
            noMgDefendEvent.trigger({ entity: guard });
            guard.removeTag("mg_defend");
        }
    }

    const mgMinions = Gaia.getEntities({ name: "MG_MINION" });
    for (const minion of mgMinions) {
        const nearbyGuards = Gaia.getEntities({
            location: minion.location,
            maxDistance: 100,
            type: "gaia:malachite_guard"
        });
        for (const guard of nearbyGuards) {
            mgDefendObjective.setScore(guard.id, 7);
        }
    }
}