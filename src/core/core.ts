import { Registry } from "../metadata/registry";

export class Core {

    private constructor() { }

    public static get metadata(): Registry {
        return Registry.get();
    }

}


