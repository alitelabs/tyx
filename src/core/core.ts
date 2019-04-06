import { LambdaAdapter, LambdaHandler } from '../aws/adapter';
import { Di } from '../import';
import { Logger } from '../logger';
import { Registry } from '../metadata/registry';
import { GraphQLTools } from '../tools/graphql';
import { Class, CommonModule, ContainerState, ModuleInfo, ObjectType, PackageInfo, ProcessInfo, ServiceInfo } from '../types/core';
import { Utils } from '../utils';
import { CoreGraphQL } from './graphql';
import { CoreInstance } from './instance';
import { CoreServer } from './server';

export abstract class Core extends Registry {
  public static log = Logger.get('TYX', Core.name);

  private static graphql: GraphQLTools;

  private static application: string;
  private static crudAllowed: boolean;
  private static instance: CoreInstance;

  private static pool: CoreInstance[];
  private static counter: number = 0;

  public static loadTime: number = Math.round(process.uptime() * 1000);
  public static initTime: number;

  protected constructor() { super(); }

  public static get schema(): GraphQLTools {
    return (this.graphql = this.graphql || new GraphQLTools(Core.validate(), this.crudAllowed));
  }

  public static register(...args: Class[]) { }

  // TODO: options object
  // Move database out
  public static init(application?: string, isPublic?: boolean, isCrud?: boolean): void;
  public static init(application?: string, register?: Class[], isCrud?: boolean): void;
  public static init(application?: string, args?: Class[] | boolean, isCrud?: boolean): void {
    if (this.instance) return;
    Core.validate();
    try {
      if (args === true) CoreGraphQL.makePublic();
      this.crudAllowed = !!isCrud;
      this.application = this.application || application || 'Core';
      this.instance = new CoreInstance(this.application, Core.name);
      this.instance.initialize();
      this.pool = [this.instance];
    } catch (err) {
      this.log.error('Failed to initialize');
      this.log.error(err);
      throw err;
    } finally {
      this.initTime = Math.round(process.uptime() * 1000) - this.loadTime;
    }
  }

  public static start(port: number, basePath?: string, extraArgs?: any) {
    return CoreServer.start(port, basePath, extraArgs);
  }

  public static async get(): Promise<CoreInstance>;
  public static async get<T>(api: ObjectType<T> | string): Promise<T>;
  public static async get<T = any>(api?: ObjectType<T> | string): Promise<T | CoreInstance> {
    const ins = await this.activate();
    return api ? ins.get(api) : ins;
  }

  public static async activate(): Promise<CoreInstance> {
    this.init();
    let instance = this.pool.find(x => x.state === ContainerState.Ready);
    try {
      if (!instance) {
        instance = new CoreInstance(this.application, Core.name, this.counter++);
        // console.log('Create ->', instance.name);
        await instance.initialize();
        instance.reserve();
        this.pool.push(instance);
        this.counter++;
        this.instance = this.instance || instance;
      } else {
        // console.log('Reuse ->', instance.name);
        instance.reserve();
      }
    } catch (err) {
      this.log.error('Failed to activate instance');
      this.log.error(err);
      throw err;
    }
    return instance;
  }

  public static async invoke(api: string, method: string, ...args: any[]): Promise<any> {
    const instance = await this.activate();
    return await instance.apiRequest(api, method, args);
  }

  public static lambda(): LambdaHandler {
    return LambdaAdapter.export();
  }

  public static serviceInfo(): ServiceInfo[] {
    const glob: any = Di.Container.of(undefined);
    const services = [...glob.services];
    return services;
  }

  public static processInfo(level?: number): ProcessInfo {
    const cache: NodeModule[] = Object.values(require.cache);
    const packages: Record<string, PackageInfo> = {};
    const modules: Record<string, ModuleInfo> = {};
    const rootItem: CommonModule = cache[0];
    const rootFile = rootItem.filename || rootItem.id || rootItem.i;

    let scriptSize = 0;
    let root: ModuleInfo;

    const rootPkg: PackageInfo = {
      name: '.',
      level: 0,
      size: 0,
      import: null,
      parent: null,
      modules: [],
      uses: [],
      imports: []
    };
    packages['.'] = rootPkg;

    function resolve(mod: CommonModule) {
      const id = mod.id || mod.i;
      const file = mod.filename || id;
      if (modules[id]) return modules[id];
      let name = (mod === rootItem) ? id : Utils.relative(file, rootFile);
      const parent = mod.parent && modules[mod.parent.id];
      const level = parent && (parent.level + 1) || 0;
      const size = Utils.fsize(file);
      scriptSize += size;
      const info: ModuleInfo = { id, name, size, package: undefined, file, level, parent };
      modules[id] = info;
      if (mod === rootItem) {
        root = info;
        rootPkg.import = root;
      }

      const ix = name && name.indexOf('node_modules/');
      if (ix >= 0) {
        name = name.substring(ix + 13);
        const parts = name.split('/');
        const pack = parts[0] + (parts[0].startsWith('@') ? '/' + parts[1] : '');
        const pkg: PackageInfo = packages[pack] || {
          name: pack,
          // from: parent && parent.package && parent.package.name,
          level: info.level,
          size: 0,
          parent: info.parent && info.parent.package,
          import: info.parent,
          modules: [],
          imports: [],
          uses: []
        };
        info.package = pkg;
        pkg.size += info.size;
        pkg.modules.push(info);
        pkg.level = Math.min(pkg.level, info.level);
        packages[pack] = pkg;
      } else {
        info.package = rootPkg;
        rootPkg.size += info.size;
        rootPkg.modules.push(info);
      }

      for (const item of mod.children || []) {
        const ch = resolve(item);
        if (ch.package === info.package) continue;
        if (!ch.package.uses.includes(info.package)) {
          ch.package.uses.push(info.package);
        }
        if (!info.package.imports.includes(ch.package)) {
          info.package.imports.push(ch.package);
        }
      }

      return info;
    }

    for (const mod of cache) {
      resolve(mod);
    }

    return {
      name: this.name,
      state: this.instance ? 'Init' : 'New',
      timestamp: new Date(),
      versions: process.versions,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node: {
        pid: process.pid,
        arch: process.arch,
        platform: process.platform,
        release: process.release
      },
      loadTime: this.loadTime,
      initTime: this.initTime,
      root,
      packageCount: Object.keys(packages).length,
      moduleCount: Object.keys(modules).length,
      scriptSize,
      packages: Object.values(packages).filter((m: any) => level === undefined || m.level <= level),
      modules: Object.values(modules).filter((m: any) => level === undefined || m.level <= level)
    };
  }
}

declare global {
  // tslint:disable-next-line:variable-name
  const Core: Core;
}
(global as any).Core = Core;
