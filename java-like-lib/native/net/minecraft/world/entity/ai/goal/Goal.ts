export enum GoalFlag {
    MOVE, LOOK, JUMP, TARGET
}

export abstract class Goal {
    public static readonly Flag = GoalFlag;
    private flags: Set<GoalFlag> = new Set();

    public abstract canUse(): boolean;

    public canContinueToUse(): boolean {
        return this.canUse();
    }

    public isInterruptible(): boolean {
        return true;
    }

    public start(): void {}
    public stop(): void {}
    public tick(): void {}

    protected setFlags(flags: Set<GoalFlag>): void {
        this.flags = flags;
    }

    /**
     * If this goal can be implemented natively in Bedrock JSON, 
     * this returns the component definition.
     */
    public getNativeConfig(): any | null {
        return null;
    }
}
