// tslint:disable-next-line:import-blacklist
import { Core, CoreSchema, Field, Input, Mutation, Query, Service, Type } from "..";

@Input()
export class TestInput {
    @Field(String) data: string;
    @Field(Boolean) urgent: boolean;
}

@Type()
export class TypeA {
    @Field(String) name: string;
}

@Type()
export class TestResult {
    @Field(String) res: string;
    @Field([String]) versions: string[];
    @Field(Boolean) bool?: boolean;
    @Field(ref => TypeA) sub?: TypeA;
    @Field(list => [TypeA]) subs?: TypeA[];
    @Field(ref => String) str?: string;
    @Field(ref => [String]) strs?: string[];
}


@Service()
export class HelloWorld {

    @Query({ Public: true }, req => TestInput, res => TestResult)
    public test(req: TestInput): TestResult {
        return { res: "world", versions: Object.entries(process.versions).map(p => p[0] + "=" + p[1]) };
    }

    @Mutation({ Public: true }, req => TestInput, res => TestResult)
    public operation(req: TestInput): TestResult {
        return { res: JSON.stringify(req), versions: ["1", "2", "3"] };
    }

    @Query({ Public: true }, req => String, res => [String])
    public testLiteral(req: string): string[] {
        return [req];
    }

    @Query({ Public: true }, [undefined], res => [String])
    public testVoid(): string[] {
        return [undefined];
    }
}

new CoreSchema().executable();

Core.start(5055);