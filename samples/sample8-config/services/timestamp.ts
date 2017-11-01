import {
    Service,
    BaseService,
    Inject,
    Public,
    Post,
    Body,
    BadRequest,
    InternalServerError
} from "../../../src";

import { ConfigApi } from "../api/config";
import { TimestampApi, TimestampResult } from "../api/timestamp";

import SHA256 = require("sha256");
import UUID = require("uuid");

@Service(TimestampApi)
export class TimestampService extends BaseService implements TimestampApi {

    @Inject(ConfigApi)
    protected config: ConfigApi;

    @Public()
    @Post("/issue")
    public issue( @Body() data: any): TimestampResult {
        let result = { id: UUID(), timestamp: new Date().toISOString(), hash: null, signature: null, data };
        let text = JSON.stringify(data);
        [result.hash, result.signature] = this.sign(result.id, result.timestamp, text);
        return result;
    }

    @Public()
    @Post("/verify")
    public verify( @Body() input: TimestampResult): TimestampResult {
        if (!input.id || !input.timestamp || !input.hash || !input.signature || !input.data)
            throw new BadRequest("Invalid input format");
        let hash: string, signature: string;
        [hash, signature] = this.sign(input.id, input.timestamp, JSON.stringify(input.data));
        if (hash !== input.hash) input.error = "Hash mismatch";
        else if (signature !== input.signature) input.error = "Invalid signature";
        else input.valid = true;
        return input;
    }

    private sign(id: string, timestamp: string, input: string): [string, string] {
        if (!this.config.timestampSecret) throw new InternalServerError("Signature secret not configured");
        if (!this.config.timestampStrength) throw new InternalServerError("Signature strength not configured");
        let hash: string = SHA256(input || "");
        let signature: string = id + "/" + timestamp + "/" + hash;
        for (let i = 0; i < this.config.timestampStrength; i++)
            signature = SHA256(signature + "/" + i + "/" + this.config.timestampSecret);
        return [hash, signature];
    }
}