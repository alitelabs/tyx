import { Lambda } from 'aws-sdk';
import { NanoTimer, ProcessInfo, Utils } from 'exer';
import { CoreConfiguration } from '../core/config';
import { Core } from '../core/core';
import { Internal } from '../decorators/auth';
import { Activate, CoreService, Initialize, Inject } from '../decorators/service';
import { Logger } from '../logger';
import { Configuration } from '../types/config';
import { Context } from '../types/core';
import { Env } from '../types/env';
import { EventRequest } from '../types/event';
import { Schedule } from './events';

export interface WarmerSettings {
  key: string;
  flush: number;
  rate: number;
  step: number;
}

export interface CoreWarmerStat {
  first: number;
  last: number;
  count: number;
  dursum: number;
  dursqr: number;
  durmin: number;
  durmax: number;
  duravg: number;
  durdev: number;
  durration: number;
}

export interface CoreWarmerState extends CoreWarmerStat {
  name: string;
  size: number;
  length: number;
  warm: number;
  cold: number;
  error?: any;
  pool: Record<string, CoreWarmerInfo>;
}

export interface CoreWarmerInfo extends CoreWarmerStat {
  identity: string;
  uptime: number;
  info?: ProcessInfo;
}

@CoreService()
export class CoreWarmer {

  private static state: CoreWarmerState[];

  @Logger()
  protected log: Logger;

  private nextFlush = 0;
  private nextPing = 0;

  @Inject(api => Configuration)
  private config: CoreConfiguration;

  private settings: WarmerSettings;

  @Initialize()
  protected init() {
    // NOP
  }

  protected get state(): CoreWarmerState[] {
    return CoreWarmer.state;
  }

  protected set state(val: CoreWarmerState[]) {
    CoreWarmer.state = val;
  }

  @Activate()
  protected async activate() {
    this.settings = this.config.warmer;

    if (this.state) return;

    const poolKey = Env.warmPoolKey || (this.config.appId.toUpperCase() + '_WARM_POOL');
    this.log.debug('Using pool key: %s', poolKey);
    this.state = this.state || [];
    try {
      const lambda = new Lambda();
      let res: Lambda.ListFunctionsResponse;
      do {
        res = await lambda.listFunctions({ Marker: res && res.NextMarker }).promise();
        for (const fun of res.Functions) {
          const pool = fun.Environment && +fun.Environment.Variables[poolKey];
          if (!pool) continue;
          this.state.push({
            name: fun.FunctionName,
            size: +fun.Environment.Variables[poolKey],
            length: 0,
            cold: 0,
            warm: 0,
            pool: {},
            ...this.stat(undefined, 0)
          });
        }
      } while (res.NextMarker);
    } catch (e) {
      this.log.error('Failed to list functions', e);
    }
    this.nextFlush = 0;
    this.nextPing = Date.now() + this.settings.rate;
    this.log.debug('Initialized: %j', this.state);
  }

  @Internal()
  @Schedule()
  public async warm(ctx: Context, req: EventRequest): Promise<string> {
    this.log.info('Ctx: %j', ctx);
    this.log.info('Req: %j', req);

    const now = Date.now();
    if (now < this.nextFlush && now < this.nextPing && !req.record.force) return 'Skip: ' + (this.nextFlush - now);
    const full = now > this.nextFlush;
    if (full) {
      this.nextFlush = now + this.settings.flush;
    }
    this.nextPing = now + this.settings.rate;

    const promises: [CoreWarmerState, Promise<ProcessInfo>][] = [];
    for (const fun of this.state) {
      const many = full ? fun.size : (Math.random() + 1) * fun.size / 2;
      for (let index = 0; index <= many; index++) {
        const delay = index * this.settings.step + Math.round(Math.random() * this.settings.step / 4);
        this.log.debug('Invoking [%s:%s] after %s ms ...', fun.name, index, delay);
        const prom = new Promise<ProcessInfo>((resolve, reject) => {
          NanoTimer.setTimeout(() => this.invoke(fun, index, resolve, reject), delay);
        });
        promises.push([fun, prom]);
      }
    }

    const infos: ProcessInfo[] = [];
    for (const [fun, prom] of promises) {
      try {
        infos.push(await prom);
      } catch (err) {
        // TODO: Push error response
        fun.error = err;
        this.log.error(err);
      }
    }

    for (const fun of this.state) {
      const cols = ['', ':', 'len', 'invokes', 'cold', 'warm', 'max', 'min', 'avg', 'dev'];
      const raw = [
        fun.name,
        fun.size,
        fun.length,
        fun.count,
        fun.cold,
        fun.warm,
        fun.durmax.toFixed(2),
        fun.durmin.toFixed(2),
        fun.duravg.toFixed(2),
        fun.durdev.toFixed(2)
      ];
      const report = raw.map((t, i) => cols[i] ? cols[i] + ': ' + t : t).join('\t');
      this.log.info('STAT:', report);
    }

    // TODO: Colate by function identity
    // infos.sort((a, b) => (a.container + a.identity).localeCompare(b.container + b.identity));

    return 'Ok';
  }

  private async invoke(fun: CoreWarmerState, index: number, resolve: (res: any) => void, reject: (err: any) => any) {
    // this.log.info('Invoked [%s:%s]', fun, index);
    const time = this.log.time();
    const lambda = new Lambda();
    try {
      const res = await lambda.invoke({
        FunctionName: fun.name,
        Payload: `{
            "type":"ping",
            "warmer": "${Core.config.identity}"
          }`
      }).promise();
      const dur = +Utils.span(time);
      const info: ProcessInfo = JSON.parse(res.Payload.toString());
      this.log.timeEnd(
        time,
        'Warmup [%s:%s]: [%s] %s @ %s',
        fun.name, index, info.identity,
        info.state.toUpperCase(), info.serial
      );
      let acc = fun.pool[info.identity];
      if (acc) {
        acc.uptime = info.uptime;
        acc.info = info;
        this.stat(acc, dur);
      } else {
        acc = {
          identity: info.identity,
          uptime: info.uptime,
          info,
          ...this.stat(null, dur, !info.serial)
        };
        fun.length++;
        fun.pool[info.identity] = acc;
      }
      this.stat(fun, dur);
      if (info.serial) fun.warm++; else fun.cold++;
      resolve(info);
    } catch (err) {
      this.log.timeEnd(
        time,
        'Error [%s:%s]:',
        fun, index, err
      );
      reject(err);
    }
  }

  private stat(acc: CoreWarmerStat, dur: number, cold?: boolean) {
    const st: CoreWarmerStat = acc || {
      first: Date.now(),
      last: Date.now(),
      count: 0,
      // cold: cold ? dur : null,
      durration: dur,
      dursum: cold ? 0 : dur,
      dursqr: cold ? 0 : dur,
      durmin: dur,
      durmax: dur,
      duravg: cold ? 0 : dur,
      durdev: 0
    };
    if (acc !== undefined) {
      if (!st.count) {
        st.first = Date.now();
        st.durmin = dur;
      }
      st.count++;
    }
    if (acc) {
      st.last = Date.now();
      st.durration = dur;
      st.dursum = acc.dursum + dur;
      st.dursqr = acc.dursqr + dur * dur;
      st.durmin = Math.min(acc.durmin, dur);
      st.durmax = Math.max(acc.durmax, dur);
      st.duravg = st.dursum / st.count;
      st.durdev = (st.dursqr / st.count - st.duravg ** 2) ** 0.5;
    }
    return st;
  }
}
