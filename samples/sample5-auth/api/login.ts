export const LoginApi = "login";

export interface LoginApi {
    login(userId: string, password: string): Promise<string>;
}