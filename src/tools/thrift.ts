import { ApiMetadata } from '../metadata/api';
import { DatabaseMetadata } from '../metadata/database';
import { EntityMetadata } from '../metadata/entity';
import { EnumMetadata } from '../metadata/enum';
import { Metadata } from '../metadata/registry';
import { RelationType } from '../metadata/relation';
import { TypeMetadata } from '../metadata/type';
import { VarKind, VarMetadata, VarSelect } from '../metadata/var';
import { Utils } from '../utils';

interface DatabaseSchema {
  metadata: DatabaseMetadata;
  name: string;
  alias: string;
  entities: Record<string, EntitySchema>;
  // query: string;
  // meta: string;
  // model: string;
  // root: Resolver;
  queries: Record<string, string>;
  mutations: Record<string, string>;
}

interface EntitySchema {
  metadata: EntityMetadata;
  name: string;
  query: string[];
  mutation: string[];
  model: string;
  inputs: string[];
  // search: string;
  // simple: string;
  // TODO: Remove
  // relations: Record<string, { target: string, type: string }>;
  // resolvers: Record<string, Resolver>;
}

interface Result {
  thrift: string;
  script: string;
}

const ENTITY = '';
const GET = 'get';
const SEARCH = 'query';
const ARGS = '';
const CREATE = 'create';
const UPDATE = 'update';
const REMOVE = 'remove';

const RESERVED = ['required', 'optional', 'service', 'enum', 'extends', 'exception', 'struct', 'throws', 'string', 'bool', 'list', 'set'];

function esc(name: string) {
  return RESERVED.includes(name) ? '__esc_' + name : name;
}

export class ThriftCodeGen {

  protected crud: boolean = true;

  public static emit(): Result {
    return new ThriftCodeGen().emit();
  }

  private constructor() { }

  public emit(): Result {
    let thrift = this.prolog() + '\n';
    let script = `import { Metadata, ResolverContext as Context } from 'tyx';\nimport gen = require('./gen/app');\n\n`;

    const registry = Metadata.get();
    thrift += '///////// API /////////\n\n';
    for (const api of Object.values(registry.Api).sort((a, b) => a.name.localeCompare(b.name))) {
      const res = this.genApi(api);
      thrift += res.thrift + '\n\n';
      script += res.script + '\n';
    }
    thrift += '///////// ENUM ////////\n\n';
    for (const type of Object.values(registry.Enum).sort((a, b) => a.name.localeCompare(b.name))) {
      thrift += this.genEnum(type) + '\n\n';
    }
    thrift += '//////// INPUTS ///////\n\n';
    for (const type of Object.values(registry.Input).sort((a, b) => a.name.localeCompare(b.name))) {
      thrift += this.genStruct(type) + '\n\n';
    }
    thrift += '//////// TYPES ////////\n\n';
    for (const type of Object.values(registry.Type).sort((a, b) => a.name.localeCompare(b.name))) {
      thrift += this.genStruct(type) + '\n\n';
    }
    // const db = Object.values(this.schema.databases)[0];
    thrift += '/////// DATABASE //////\n\n';
    for (const type of Object.values(registry.Database).sort((a, b) => a.name.localeCompare(b.name))) {
      const res = this.genDatabase(type);
      thrift += res.thrift + '\n\n';
      script += res.script + '\n';
    }
    thrift += '//////// METADATA ////////\n\n';
    for (const type of Object.values(registry.Registry).sort((a, b) => a.name.localeCompare(b.name))) {
      thrift += this.genStruct(type) + '\n\n';
    }
    return { thrift, script };
  }

  private prolog(): string {
    return Utils.unindent(`
      namespace java tyx

      union Json {
        1: double N;
        2: string S;
        3: bool B;
        4: list<Json> L;
        5: map<string, Json> M;
      }

      typedef string ID
      typedef string Date

      // TODO: CoreException
    `).trimLeft();
  }

  private genEnum(meta: EnumMetadata): string {
    let script = `enum ${meta.name} {`;
    let i = 0;
    for (const key of meta.options) {
      script += `${i ? ',' : ''}\n  ${esc(key)} = ${i}`;
      i++;
    }
    script += '\n}';
    return script;
  }

  private genStruct(meta: TypeMetadata): string {
    let script = `struct ${meta.name} {`;
    let index = 0;
    for (const field of Object.values(meta.members)) {
      const type = field.build;
      const opt = true; // GraphKind.isEntity(struc.kind) ? !field.required : true;
      script += `${index ? ',' : ''}\n  ${index + 1}: ${opt ? 'optional' : ''} ${type.idl} ${esc(field.name)}`;
      index++;
    }
    script += `\n} (kind = "${meta.kind}")`;
    return script;
  }

  private genApi(metadata: ApiMetadata): Result {
    let thrift = `service ${metadata.name} {`;
    let script = `const handler${metadata.name}: gen.${metadata.name}.IHandler<any> = {\n`;
    let count = 0;
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation) continue;

      const result = method.result.build;
      let idlArgs = '';
      let jsArgs = '';
      let reqArgs = '';
      let qlArgs = '';
      let params = '';
      for (let i = 0; i < method.inputs.length; i++) {
        const inb = method.inputs[i].build;
        if (VarKind.isVoid(inb.kind) || VarKind.isResolver(inb.kind)) continue;
        const param = method.inputs[i].name;
        if (idlArgs) { idlArgs += ', '; jsArgs += ', '; reqArgs += ', '; qlArgs += ', '; params += ', '; }
        params += param;
        idlArgs += `${i + 1}: ${inb.idl} ${esc(param)}`;
        jsArgs += `${param}: ${VarKind.isScalar(inb.kind) ? '' : 'gen.'}${inb.js}`;
        reqArgs += `$${param}: ${inb.gql}!`;
        qlArgs += `${param}: $${param}`;
      }
      if (reqArgs) reqArgs = `(${reqArgs})`;
      if (qlArgs) qlArgs = `(${qlArgs})`;
      if (jsArgs) jsArgs += ', ';
      jsArgs += 'ctx?: Context';

      if (count) thrift += ',';
      // if (method.mutation) {
      thrift += `\n  ${result.idl} ${esc(method.name)}(${idlArgs})`;
      // } else {
      //   script += `\n  ${result.idl} ${method.name}(${idlArgs}${idlArgs ? ', ' : ''}refresh: bool)`;
      // }

      script += `${count ? ',\n\n' : ''}  ${method.name}(${jsArgs}): gen.${result.js} {\n`;
      script += `    const graphReq = {\n`;
      if (method.mutation) {
        script += `      mutation: gql\`mutation request${reqArgs} {\n`;
      } else {
        script += `      query: gql\`query request${reqArgs} {\n`;
      }
      script += `        result: ${method.api.name}_${method.name}${qlArgs} `;
      if (VarKind.isStruc(result.kind)) {
        const x = (VarKind.isType(result.kind)) ? 0 : 0;
        const select = this.genSelect(result, method.select, 0, 1 + x);
        script += select;
      } else if (VarKind.isArray(result.kind)) {
        const x = (VarKind.isType(result.item.kind)) ? 0 : 0;
        const select = this.genSelect(result.item, method.select, 0, 1 + x);
        script += select;
      } else {
        script += `// : Scalar`;
      }
      script += `\n      }\``;
      if (qlArgs) script += `,\n      variables: { ${params} }`;
      if (method.query) {
        script += `,\n      // fetchPolicy: NO_CACHE ? 'no-cache' : refresh ? 'network-only' : 'cache-first'`;
      }
      script += `\n    };\n`;
      script += `    return ctx.execute(graphReq);\n`;
      script += `  }`;

      count++;
    }
    thrift += '\n}';
    script += '\n};\n';
    return { thrift, script };
  }

  private genSelect(meta: VarMetadata, select: VarSelect | any, level: number, depth: number): string {
    if (level >= depth) return null;
    if (VarKind.isScalar(meta.kind)) return `# ${meta.js}`;
    if (VarKind.isRef(meta.kind)) return this.genSelect(meta.build, select, level, depth);
    if (VarKind.isArray(meta.kind)) return this.genSelect(meta.item, select, level, depth);
    // script += ` # [ANY]\n`;
    // #  NONE
    const type = meta as TypeMetadata;
    const tab = '  '.repeat(level + 4);
    let script = `{`;
    let i = 0;
    for (const member of Object.values(type.members)) {
      if (VarKind.isVoid(member.kind)) continue;
      let name = member.name;
      let def = `# ${member.build.js}`;
      if (!VarKind.isScalar(member.kind) && !VarKind.isEnum(member.build.kind)) {
        def += ' ...';
        if (select instanceof Object && select[member.name]) {
          const sub = this.genSelect(member.build, select && select[member.name], level + 1, depth + 1);
          def = sub || def;
          if (!sub) name = '# ' + name;
        } else {
          name = '# ' + name;
        }
      }
      script += `${i++ ? ',' : ''}\n${tab}  ${name} ${def}`;
    }
    script += `\n${tab}}`;
    return script;
  }

  private genDatabase(metadata: DatabaseMetadata): Result {
    const db: DatabaseSchema = {
      metadata,
      name: metadata.name,
      alias: metadata.alias,
      entities: {},
      queries: {},
      mutations: {}
    };

    for (const entity of metadata.entities) this.genEntity(db, entity);

    let thrift = `# -- Database: ${metadata.name} --\n`;
    thrift += `service ${db.metadata.target.name} {\n`;
    for (const entity of Object.values(db.entities)) {
      thrift += `  // -- ${entity.name}\n`;
      entity.query.forEach(line => thrift += `  ` + line);
      entity.mutation.forEach(line => thrift += `  ` + line);
    }
    thrift += `} (kind="Database")\n`;
    for (const entity of Object.values(db.entities)) {
      thrift += `\n# -- Entity: ${entity.name} --\n`;
      thrift += entity.model;
      thrift += "\n";
    }
    for (const entity of Object.values(db.entities)) {
      thrift += `\n# -- Entity: ${entity.name} --\n`;
      thrift += entity.inputs.join('\n');
      thrift += "\n";
    }

    let script = `const handler${metadata.name}: gen.${metadata.name}.IHandler<any> = {\n`;
    for (let [name, body] of Object.entries(db.queries)) {
      body = Utils.unindent(body, '  ').trimLeft();
      script += `  ${name}${body},\n`;
    }
    for (let [name, body] of Object.entries(db.mutations)) {
      body = Utils.unindent(body, '  ').trimLeft();
      script += `  ${name}${body},\n`;
    }
    script += '};';

    return { thrift, script };
  }

  private genEntity(db: DatabaseSchema, entity: EntityMetadata): EntitySchema {
    const name = entity.name;
    if (db.entities[name]) return db.entities[name];

    let model = `struct ${name}${ENTITY} {`;
    let partial = `PartialExpr {`;
    let nil = `NullExpr {`;
    let multi = `MultiExpr {`;
    let like = `LikeExpr {`;
    let order = `OrderExpr {`;
    let create = `CreateRecord {`;
    let update = `UpdateRecord {`;
    let keys = '';
    let keyJs = '';
    let keyNames = '';
    let keyIx = 0;
    let index = 0;
    let cm = true;
    for (const col of entity.columns) {
      if (col.isTransient) continue;
      index++;
      const pn = col.propertyName;
      let dt = col.build.idl;
      let nl = col.required ? 'required' : 'optional';
      if (pn.endsWith('Id')) dt = VarKind.ID;
      model += `${cm ? '' : ','}\n  ${index}: ${nl} ${dt} ${pn}`;
      if (col.isPrimary) {
        keys += `${cm ? '' : ', '}${++keyIx}: ${nl} ${dt} ${pn}`;
        keyJs += `${cm ? '' : ', '}${pn}: ${col.build.js}`;
        keyNames += `${cm ? '' : ', '}${pn}`;
      }
      partial += `${cm ? '' : ','}\n  ${index}: optional ${dt} ${pn}`;
      nil += `${cm ? '' : ','}\n  ${index}: optional bool ${pn}`;
      multi += `${cm ? '' : ','}\n  ${index}: optional list<${dt}> ${pn}`;
      like += `${cm ? '' : ','}\n  ${index}: optional string ${pn}`;
      order += `${cm ? '' : ','}\n  ${index}: optional i16 ${pn}`;
      update += `${cm ? '' : ','}\n  ${index}: ${col.isPrimary ? 'required' : 'optional'} ${dt} ${pn}`;
      if (col.isCreateDate || col.isUpdateDate || col.isVersion || col.isVirtual || col.isGenerated) nl = 'optional';
      create += `${cm ? '' : ','}\n  ${index}: ${nl} ${dt} ${pn}`;
      cm = false;
    }
    // Debug field
    // model += `,\n  _exclude: Boolean`;
    // model += `,\n  _debug: _DebugInfo`;
    let qix = 0;
    const opers = [
      `${++qix}: optional ${ARGS}${name}PartialExpr if`,
      `${++qix}: optional ${ARGS}${name}PartialExpr eq`,
      `${++qix}: optional ${ARGS}${name}PartialExpr ne`,
      `${++qix}: optional ${ARGS}${name}PartialExpr gt`,
      `${++qix}: optional ${ARGS}${name}PartialExpr gte`,
      `${++qix}: optional ${ARGS}${name}PartialExpr lt`,
      `${++qix}: optional ${ARGS}${name}PartialExpr lte`,
      `${++qix}: optional ${ARGS}${name}LikeExpr like`,
      `${++qix}: optional ${ARGS}${name}LikeExpr nlike`,
      `${++qix}: optional ${ARGS}${name}LikeExpr rlike`,
      `${++qix}: optional ${ARGS}${name}MultiExpr in`,
      `${++qix}: optional ${ARGS}${name}MultiExpr nin`,
      `${++qix}: optional ${ARGS}${name}NullExpr nil`, // TODO
      `${++qix}: optional ${ARGS}${name}WhereExpr not`,
      `${++qix}: optional ${ARGS}${name}WhereExpr nor`,
      `${++qix}: optional list<${ARGS}${name}WhereExpr> and`,
      `${++qix}: optional list<${ARGS}${name}WhereExpr> or`,
    ];

    const where = `WhereExpr {\n  `
      + opers.join(',\n  ');

    const queryExpr = 'QueryExpr {'
      + `\n  `
      + opers.join(',\n  ') + `,`
      + `\n  ${++qix}: optional ${ARGS}${name}OrderExpr order,`
      + `\n  ${++qix}: optional i32 skip,`
      + `\n  ${++qix}: optional i32 take,`
      + `\n  ${++qix}: optional bool exists`;

    const temp = [queryExpr, where, partial, nil, multi, like, order];
    if (this.crud) {
      temp.push(create);
      temp.push(update);
    }
    const inputs = temp.map(x => `struct ${ARGS}${name}${x}\n} (kind = "Expression")\n`);

    const queryInput = `1: optional ${ARGS}${name}QueryExpr query`;
    const query = [
      `${name}${ENTITY} ${GET}${name}(${keys}); // @crud(auth: {})\n`,
      `list<${name}${ENTITY}> ${SEARCH}${name}(${queryInput});  // @crud(auth: {})\n`
    ];

    const mutation = [
      `${name}${ENTITY} ${CREATE}${name}(1: required ${ARGS}${name}CreateRecord record); // @crud(auth: {}),\n`,
      `${name}${ENTITY} ${UPDATE}${name}(1: required ${ARGS}${name}UpdateRecord record); // @crud(auth: {}),\n`,
      `${name}${ENTITY} ${REMOVE}${name}(${keys}); // @crud(auth: {})\n`,
    ];

    const schema: EntitySchema = {
      metadata: entity,
      name: entity.name,

      query,
      mutation: this.crud ? mutation : undefined,
      model,
      inputs,
      // search,
      // simple: model
      // relations: {},
    };
    db.queries = {
      ...db.queries,
      [`${GET}${name}`]: `
      (${keyJs}, ctx?: Context): Promise<gen.${entity.name}> {
        return ctx.provider.get(Metadata.Entity['${entity.name}'], null, { ${keyNames} }, ctx);
      }`,
      [`${SEARCH}${name}`]: `
      (query: gen.${ARGS}${name}QueryExpr, ctx?: Context): Promise<gen.${entity.name}[]> {
        return ctx.provider.search(Metadata.Entity['${entity.name}'], null, { query }, ctx);
      }`,
    };
    db.mutations = this.crud ? {
      ...db.mutations,
      [`${CREATE}${name}`]: `
      (record: gen.${ARGS}${name}CreateRecord, ctx?: Context): Promise<gen.${name}${ENTITY}> {
        return ctx.provider.create(Metadata.Entity['${entity.name}'], null, record, ctx);
      }`,
      [`${UPDATE}${name}`]: `
      (record: gen.${ARGS}${name}UpdateRecord, ctx?: Context): Promise<gen.${name}${ENTITY}> {
        return ctx.provider.update(Metadata.Entity['${entity.name}'], null, record, ctx);
      }`,
      [`${REMOVE}${name}`]: `
      (${keyJs}, ctx?: Context): Promise<gen.${name}${ENTITY}> {
        return ctx.provider.remove(Metadata.Entity['${entity.name}'], null, { ${keyNames} }, ctx);
      }`,
    } : db.mutations;
    db.entities[name] = schema;

    // let simple = model;
    // const navigation: Record<string, Resolver> = {};
    for (const relation of entity.relations) {
      const property = relation.propertyName;
      const inverse = relation.inverseEntityMetadata.name;
      const rm = /* schema.relations[property] = */ { inverse } as any;
      // TODO: Subset of entities
      // if (!entities.find(e => e.name === target)) continue;
      if (relation.relationType === RelationType.ManyToOne) {
        rm.type = 'manyToOne';
        const args = '';
        model += `,\n  ${++index}: optional ${inverse}${ENTITY} ${property}${args} (relation = "ManyToOne")`;
        // simple += `,\n  ${property}: ${inverse}${ENTITY}`;
        // navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToOne) {
        rm.type = 'oneToOne';
        const args = '';
        model += `,\n  ${++index}: optional ${inverse}${ENTITY} ${property}${args} (relation = "OneToOne")`;
        // navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToOne(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.OneToMany) {
        rm.type = 'oneToMany';
        // const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ''; // ` (${temp.search}\n  )`;
        model += `,\n  ${++index}: optional list<${inverse}${ENTITY}> ${property}${args} (relation = "OneToMany")`;
        // navigation[property] = (obj, args, ctx, info) => ctx.provider.oneToMany(metadata, relation, obj, args, ctx, info);
      } else if (relation.relationType === RelationType.ManyToMany) {
        rm.type = 'manyToMany';
        // const temp = this.genEntity(db, relation.inverseEntityMetadata);
        const args = ''; //  ` (${temp.search}\n  )`;
        model += `,\n  ${++index}: optional list<${inverse}${ENTITY}> ${property}${args} (relation = "ManyToMany")`;
        // navigation[property] = (obj, args, ctx, info) => ctx.provider.manyToMany(metadata, relation, obj, args, ctx, info);
      }
    }
    for (const col of entity.columns) {
      if (!col.isTransient) continue;
      const pn = col.propertyName;
      // const nl = col.required ? '!' : '';
      model += `${cm ? '' : ','}\n  ${++index}: optional ${col.build.idl} ${pn} (transient)`;
    }
    model += `\n} (kind="Entity")`;
    // simple += '\n}';

    schema.model = model;
    // schema.simple = simple;
    // schema.resolvers = navigation;
    // schema.schema = query + "\n" + mutation + "\n" + model + "\n" + inputs.join("\n");

    return schema;
  }
}
