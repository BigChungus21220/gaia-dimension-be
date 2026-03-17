export interface IEventBus {
    addListener(listener: any): void;
    register(target: any): void;
}

export class EventBus implements IEventBus {
    public addListener(listener: any): void {}
    public register(target: any): void {
        if (target && typeof target.register === 'function') {
            target.register(this);
        }
    }
}
