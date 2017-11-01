
import {
    Service,
    Security,
    Inject,
    Public,
    Post,
    BodyParam,
    ContentType,
    Unauthorized
} from "../../../src";

import {
    LoginApi
} from "../api/login";

@Service(LoginApi)
export class LoginService implements LoginApi {

    @Inject(Security)
    protected security: Security;

    @Public()
    @Post("/login")
    @ContentType("text/plain")
    public async login(
            @BodyParam("userId") userId: string,
            @BodyParam("password") password: string): Promise<string> {
        let role: string = undefined;
        switch (userId) {
            case "admin": role = password === "nimda" && "Admin"; break;
            case "manager": role = password === "reganam" && "Manager"; break;
            case "operator": role = password === "rotarepo" && "Operator"; break;
        }
        if (!role) throw new Unauthorized("Unknown user or invalid password");
       return await this.security.issueToken({ subject: "user:internal", userId, role });
    }
}