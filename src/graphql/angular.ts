import { Core } from '../core/core';
import { ApiMetadata } from '../metadata/api';
import { GraphKind, Select, TypeMetadata, VarMetadata } from '../metadata/type';
import '../schema/registry';
import { CoreSchema } from './schema';
import { back } from './utils';

export class AngularCodeGen {

  public constructor(
    private schema?: CoreSchema
  ) {
    this.schema = this.schema || Core.schema;
  }

  public emit(): string {
    let script = back(`
    import { Injectable } from '@angular/core';
    import { Apollo } from 'apollo-angular';
    import { ApolloQueryResult } from 'apollo-client';
    import { FetchResult } from 'apollo-link';
    import gql from 'graphql-tag';
    import { Observable } from 'rxjs';
    import { catchError, map } from 'rxjs/operators';

    const NO_CACHE = true;

    export interface ApiError {
      code: number;
      message: string;
    }

    interface Result<T> { result: T; }

    function result<T>(res: ApolloQueryResult<Result<T>>): T {
      return res.data.result;
    }

    function fetch<T>(res: FetchResult<Result<T>>): T {
      return res.data.result;
    }

    function erorr(err: any): never {
      err = err.networkError ? (err.networkError.error || err.networkError) : err;
      err.code = err.code || err.status;
      throw err;
    }

    `).trimLeft();
    script += '///////// API /////////\n';
    for (const api of Object.values(this.schema.apis).sort((a, b) => a.api.localeCompare(b.api))) {
      const code = this.genAngular(api.metadata);
      if (code) script += code + '\n\n';
    }
    script += '///////// ENUM ////////\n';
    for (const type of Object.values(this.schema.enums).sort((a, b) => a.name.localeCompare(b.name))) {
      script += type.script + '\n\n';
    }
    script += '/////// ENTITIES //////\n';
    // const db = Object.values(this.schema.databases)[0];
    for (const type of Object.values(this.schema.entities).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type.metadata) + '\n\n';
    }
    script += '//////// INPUTS ///////\n';
    for (const type of Object.values(this.schema.inputs).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type.metadata) + '\n\n';
    }
    script += '//////// TYPES ////////\n';
    for (const type of Object.values(this.schema.types).sort((a, b) => a.name.localeCompare(b.name))) {
      script += this.genInterface(type.metadata) + '\n\n';
    }
    return script;
  }

  private genInterface(struc: TypeMetadata): string {
    let script = `export interface ${struc.name} {`;
    for (const field of Object.values(struc.members)) {
      const type = field.build;
      const opt = true; // GraphKind.isEntity(struc.kind) ? !field.required : true;
      script += `\n  ${field.name}${opt ? '?' : ''}: ${type.js};`;
    }
    script += '\n}';
    return script;
  }

  private genAngular(metadata: ApiMetadata): string {
    let script = `@Injectable()\nexport class ${metadata.name} {\n`;
    script += `  constructor(private graphql: Apollo) { }\n`;
    let count = 0;
    for (const method of Object.values(metadata.methods)) {
      if (!method.query && !method.mutation && !method.resolver) continue;
      count++;
      const input = method.input.build;
      const result = method.result.build;
      const param = (method.resolver ? method.design[1].name : method.design[0].name) || 'input';
      const jsArg = (GraphKind.isVoid(input.kind) ? '' : `${param}: ${input.js}`);
      const reqArg = (GraphKind.isVoid(input.kind) ? '' : `($${param}: ${input.def})`);
      const qlArg = (GraphKind.isVoid(input.kind) ? '' : `(${param}: $${param})`);
      const action = method.mutation ? 'mutate' : 'query';
      if (method.mutation) {
        script += `\n  public ${method.name}(${jsArg}): Observable<${result.js}> {\n`;
      } else {
        script += `\n  public ${method.name}(${jsArg}${jsArg ? ', ' : ''}refresh?: boolean): Observable<${result.js}> {\n`;
      }
      script += `    return this.graphql.${action}<Result<${result.js}>>({\n`;
      if (method.mutation) {
        script += `      mutation: gql\`mutation request${reqArg} {\n`;
      } else {
        script += `      query: gql\`query request${reqArg} {\n`;
      }
      script += `        result: ${method.api.name}_${method.name}${qlArg}`;
      if (GraphKind.isStruc(result.kind)) {
        const x = (GraphKind.isType(result.kind)) ? 0 : 0;
        const select = this.genSelect(result, method.select, 0, 1 + x);
        script += ' ' + select;
      } else if (GraphKind.isArray(result.kind)) {
        const x = (GraphKind.isType(result.item.kind)) ? 0 : 0;
        const select = this.genSelect(result.item, method.select, 0, 1 + x);
        script += ' ' + select;
      } else {
        script += ` # : ANY`;
      }
      script += `\n      }\``;
      if (qlArg) script += `,\n      variables: { ${param} }`;
      if (method.mutation) {
        script += `    }).pipe(map(res => fetch(res)), catchError(err => erorr(err)));\n`;
      } else {
        script += `,\n      fetchPolicy: NO_CACHE ? 'no-cache' : refresh ? 'network-only' : 'cache-first'\n`;
        script += `    }).pipe(map(res => result(res)), catchError(err => erorr(err)));\n`;
      }
      script += `  }\n`;
    }
    script += '}';
    return count ? script : '';
  }

  private genSelect(meta: VarMetadata, select: Select | any, level: number, depth: number): string {
    if (level >= depth) return null;
    if (GraphKind.isScalar(meta.kind)) return `# ${meta.js}`;
    if (GraphKind.isRef(meta.kind)) return this.genSelect(meta.build, select, level, depth);
    if (GraphKind.isArray(meta.kind)) return this.genSelect(meta.item, select, level, depth);
    // script += ` # [ANY]\n`;
    // #  NONE
    const type = meta as TypeMetadata;
    const tab = '  '.repeat(level + 4);
    let script = `{`;
    let i = 0;
    for (const member of Object.values(type.members)) {
      if (GraphKind.isVoid(member.kind)) continue;
      let name = member.name;
      let def = `# ${member.build.js}`;
      if (!GraphKind.isScalar(member.kind)) {
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
}
