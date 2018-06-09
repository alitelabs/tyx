// tslint:disable-next-line:import-blacklist
import { Core, Mutation, Public, Query, Service } from "..";

@Service()
export class HelloWorld {

    @Public() @Query()
    public test(req: any) {
        return { hello: "world", req };
    }

    @Public() @Mutation()
    public operation(req: any) {
        return req;
    }
}

Core.start(5055);