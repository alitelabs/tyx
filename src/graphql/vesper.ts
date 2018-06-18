import { CoreSchema, EntitySchema } from '../core/schema';

const ENTITY = '';
const GET = '';
const SEARCH = '';

export default function codegen(schema: CoreSchema, folder: string, extension?: string) {
  const ext = extension || 'gql';
  const fs = require('fs');
  fs.writeFileSync(
    `${folder}/schema/import.${ext}`,
    CoreSchema.prolog().replace('scalar Date', '#scalar Date')
  );
  for (const target in schema.databases[0].entities) {
    const entry = schema.databases[0].entities[target];
    fs.writeFileSync(`${folder}/schema/controller/${target}Controller.${ext}`, entry.query + '\n\n' + entry.mutation);
    fs.writeFileSync(`${folder}/schema/model/${target}${ENTITY}.${ext}`, entry.model);
    fs.writeFileSync(`${folder}/schema/input/${target}Input.${ext}`, entry.inputs.join('\n\n'));
    fs.writeFileSync(`${folder}/controller/${target}Controller.ts`, controller(target));
    if (!Object.keys(entry.resolvers).length) continue;
    fs.writeFileSync(`${folder}/resolver/${target}Resolver.ts`, resolver(target, entry.relations));
  }
  const { conIndex, resIndex } = indexes(schema.databases[0].entities);
  fs.writeFileSync(`${folder}/controller/index.ts`, conIndex);
  fs.writeFileSync(`${folder}/resolver/index.ts`, resIndex);
  // fs.writeFileSync(`${folder}/schema/prisma.graphql`, ToolkitSchema.genPrisma(schema));
}

function controller(target: string) {
  return back('    ', `
    import { EntityManager } from "typeorm";
    import { Controller, Mutation, Query } from "vesper";
    import { ${target} } from "../../entity";
    import { TypeOrm, ToolkitArgs, ToolkitContext, ToolkitInfo } from "../../toolkit";

    @Controller()
    export class ${target}Controller {
        constructor(public _manager: EntityManager) { }

        @Query({ name: "${SEARCH}${target}s" })
        public async search(args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<${target}[]> {
            return TypeOrm.search(${target}.name, undefined, args, context, info);
        }

        @Query({ name: "${GET}${target}" })
        public async get(args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<${target}> {
            return TypeOrm.get(${target}.name, undefined, args, context, info);
        }

        @Mutation()
        public async create${target}(args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<${target}> {
            return TypeOrm.create(${target}.name, undefined, args, context, info);
        }

        @Mutation()
        public async update${target}(args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<${target}> {
            return TypeOrm.update(${target}.name, undefined, args, context, info);
        }

        @Mutation()
        public async remove${target}(args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo): Promise<${target}> {
            return TypeOrm.remove(${target}.name, undefined, args, context, info);
        }
    }
    `);
}

function resolver(target: string, relations: Record<string, { target: string, type: string }>) {
  return back('    ', `
    import { Resolver, ResolverInterface, Resolve } from "vesper";
    import { EntityManager } from "typeorm";
    import { ${target} } from "../../entity";
    import { TypeOrm, ToolkitArgs, ToolkitContext, ToolkitInfo } from "../../toolkit";\n` +
    Object.values(relations)
      .filter(r => r.target !== target)
      .map(r => `import { ${r.target} } from "../../entity/${r.target}";`)
      .join('\n') + `

    @Resolver(${target})
    export class ${target}Resolver implements ResolverInterface<${target}> {
        constructor(public _manager: EntityManager) { }
    ` + Object.entries(relations).map(rel => `
        @Resolve()
        public async ${rel[0]}(root: ${target}, args: ToolkitArgs, context: ToolkitContext, info?: ToolkitInfo)`
      + `: Promise<${rel[1].target}${rel[1].type.endsWith('Many') ? '[]' : ''}> {
            return TypeOrm.${rel[1].type}(${target}.name, this.${rel[0]}.name, root, args, context, info);
        }`).join('\n') + `
    }`);
}

function indexes(schema: Record<string, EntitySchema>) {
  let conImport = '';
  let conArray = '';
  let resImport = '';
  let resArray = '';
  for (const name of Object.keys(schema).sort()) {
    const entry = schema[name];
    conImport += `import { ${name}Controller } from "./${name}Controller";\n`;
    conArray += `        ${name}Controller,\n`;
    if (!Object.keys(entry.resolvers).length) continue;
    resImport += `import { ${name}Resolver } from "./${name}Resolver";\n`;
    resArray += `        ${name}Resolver,\n`;
  }
  conArray = conArray.trim();
  resArray = resArray.trim();

  const conIndex = back('    ', `
    ${conImport}
    export {
        ${conArray}
    };\n
    export const CONTROLLERS = [
        ${conArray}
    ];
    `);

  const resIndex = back('    ', `
    ${resImport}
    export {
        ${resArray}
    };\n
    export const RESOLVERS = [
        ${resArray}
    ];
    `);
  return { conIndex, resIndex };
}

function back(prefix: string, text: string) {
  return text.split('\n').map(line => line.replace(prefix, '')).join('\n').trim();
}
