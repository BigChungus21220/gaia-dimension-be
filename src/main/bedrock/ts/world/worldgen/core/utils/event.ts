/**
 * Represents an event signal.
 */
const sessions = new WeakMap<any, Set<Function>>();

export function TriggerEvent(event: any, ...params: any[]): Promise<void>[] {
    if (sessions.has(event)) {
        const promises: Promise<void>[] = [];
        sessions.get(event)?.forEach((method) => {
            promises.push((async () => method(...params))().catch(e => console.error(e, e.stack)));
        });
        return promises;
    }
    return [];
}

export class PublicEvent {
    constructor() { sessions.set(this, new Set()); }
    
    subscribe<T extends Function>(method: T): T {
        const t = typeof method;
        if (t !== "function")
            throw new TypeError(`Expected a function, but got ${t}.`);
        if (sessions.has(this)) {
            const set = sessions.get(this);
            if (set && !set.has(method))
                set.add(method);
        }
        return method;
    }

    unsubscribe<T extends Function>(method: T): T {
        const t = typeof method;
        if (t !== "function")
            throw new TypeError(`Expected a function, but got ${t}.`);
        if (sessions.has(this))
            sessions.get(this)?.delete(method);
        return method;
    }
}

export class NativeEvent extends PublicEvent {
    async trigger(...params: any[]): Promise<void> {
        if (sessions.has(this)) {
            const promises: Promise<void>[] = [];
            sessions.get(this)?.forEach((method) => {
                promises.push((async () => method(...params))().catch(e => console.error(e, e.stack)));
            });
            await Promise.all(promises);
        }
    }
}
