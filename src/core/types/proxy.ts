import "../env";

import { Call } from "./common";

export interface RemoteCall extends Call {
    application: string;
    token: string;
    args: any[];
}