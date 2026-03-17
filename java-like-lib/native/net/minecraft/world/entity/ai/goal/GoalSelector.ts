import { Goal } from "./Goal.js";

export interface WrappedGoal {
    priority: number;
    goal: Goal;
}

export class GoalSelector {
    private readonly goals: Set<WrappedGoal> = new Set();

    public addGoal(priority: number, goal: Goal): void {
        this.goals.add({ priority, goal });
    }

    public removeGoal(goal: Goal): void {
        for (const wrapped of this.goals) {
            if (wrapped.goal === goal) {
                this.goals.delete(wrapped);
                break;
            }
        }
    }

    public getAvailableGoals(): WrappedGoal[] {
        return Array.from(this.goals).sort((a, b) => a.priority - b.priority);
    }

    public tick(): void {
        for (const wrapped of this.getAvailableGoals()) {
            if (wrapped.goal.canUse()) {
                wrapped.goal.tick();
            }
        }
    }
}
