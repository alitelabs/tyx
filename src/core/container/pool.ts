import "../env";

import {
    RestCall,
    RestResult,
    RemoteCall,
    EventCall,
    EventResult
} from "../types";

import {
    Service,
    Proxy
} from "../decorators";

import {
    Configuration,
    Security
} from "../base";

import {
    ContainerMetadata
} from "../metadata";

import {
    Logger
} from "../logger";

import {
    ContainerInstance
} from "./instance";

import {
    Container,
    ContainerState
} from "./common";

import {
    InternalServerError
} from "../errors";


export class ContainerPool implements Container {
    protected log: Logger;

    private _application: string;
    private _name: string;

    private _state: ContainerState;

    private _registers: { target: any, args: any[] }[];
    private _publishes: { service: any, args: any[] }[];

    private _head: ContainerInstance;
    private _pool: ContainerInstance[];

    constructor(application: string, name?: string) {
        this._application = application;
        this._name = name || ContainerPool.name;
        this.log = Logger.get(application, this._name);
        this._state = ContainerState.Pending;
        this._registers = [];
        this._publishes = [];
        this._pool = [];
    }

    public register(resource: Object, name?: string): this;
    public register(service: Service): this;
    public register(proxy: Proxy): this;
    public register(type: Function, ...args: any[]): this;
    public register(target: Object | Service | Proxy | Function, ...args: any[]): this {
        if (this._state !== ContainerState.Pending) throw new InternalServerError("Invalid container state");
        this._registers.push({ target, args });
        return this;
    }

    public publish(service: Function, ...args: any[]): this;
    public publish(service: Service): this;
    public publish(service: Service | Function, ...args: any[]): this {
        if (this._state !== ContainerState.Pending) throw new InternalServerError("Invalid container state");
        this._publishes.push({ service, args });
        return this;
    }

    public state(): ContainerState {
        return this._state;
    }

    public metadata(): ContainerMetadata {
        if (this._state !== ContainerState.Ready) return undefined;
        return this._head.metadata();
    }

    public config(): Configuration {
        if (this._state !== ContainerState.Ready) return undefined;
        return this._head.get<Configuration>(Configuration);
    }

    public security(): Security {
        if (this._state !== ContainerState.Ready) return undefined;
        return this._head.get<Security>(Security);
    }

    public prepare(): ContainerInstance {
        let instance = this._pool.find(x => x.state() === ContainerState.Ready);
        if (!instance) {
            instance = new ContainerInstance(this._application, this._pool.length.toString());
            // TODO: Identity

            this._registers.forEach(u => instance.register(u.target, ...u.args));
            this._publishes.forEach(p => instance.publish(p.service, ...p.args));
            instance.prepare();

            this._pool.push(instance);
            this._head = this._head || instance;
        }
        if (this._state === ContainerState.Pending)
            this._state = ContainerState.Ready;
        return instance;
    }

    public dispose(): void {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        this._pool = [this._head];
    }

    public async remoteCall(call: RemoteCall): Promise<any> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = this.prepare();
        return instance.remoteCall(call);
    }

    public async eventCall(call: EventCall): Promise<EventResult> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = this.prepare();
        return instance.eventCall(call);
    }

    public async restCall(call: RestCall): Promise<RestResult> {
        if (this._state !== ContainerState.Ready) throw new InternalServerError("Invalid container state");
        let instance = this.prepare();
        return instance.restCall(call);
    }
}

