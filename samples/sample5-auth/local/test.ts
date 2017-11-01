// import Http = require("http");
// const hostname = "localhost";
// const port = 5000;

import Http = require("https");
const hostname = "2xuoozq2m7.execute-api.us-east-1.amazonaws.com";
const port = undefined;

main().then();

async function main() {
    console.log("Admin login ...");
    let adminToken = await post("/demo/login", { userId: "admin", password: "nimda" });
    console.log("Ok");

    console.log("Reset ...");
    let resetAck = await post("/demo/reset", {}, adminToken);
    console.log(resetAck);

    console.log("Create product ...");
    let box = { id: "box", name: "Gift box" };
    let boxAck = await post("/demo/product", box, adminToken);
    console.log(boxAck);

    console.log("Create product ...");
    let red = { id: "red", name: "Red box" };
    let redAck = await post("/demo/product", red, adminToken);
    console.log(redAck);

    console.log("Get status ...");
    let status = await get("/demo/status");
    console.log(status);

    console.log("Failed manager login ...");
    try {
        await post("/demo/login", { userId: "manager", password: "reganamm" });
    } catch (err) {
        console.log(err);
    }

    console.log("Manager login ...");
    let managerToken = await post("/demo/login", { userId: "manager", password: "reganam" });
    console.log("Ok");

    console.log("Start production ...");
    let startAck = await put("/demo/product/red?dummy=param", "startProduction", { orderId: "start" }, managerToken);
    console.log(startAck);

    console.log("Operator login ...");
    let userToken = await post("/demo/login", { userId: "operator", password: "rotarepo" });
    console.log("Ok");

    console.log("Unathorized ...");
    try {
        await put("/demo/product/box", "startProduction", { orderId: "Test" }, userToken);
    } catch (err) {
        console.log(err);
    }

    console.log("BadRequest ...");
    try {
        await get("/demo/product/box", userToken);
    } catch (err) {
        console.log(err);
    }

    console.log("Production ...");
    let item = await get("/demo/product/red", userToken);
    console.log(item);
}

async function post(path: string, body: any, token?: string): Promise<any> {
    return new Promise<any>((resoleve, reject) => {
        let req = Http.request({
            hostname,
            path,
            port,
            method: "POST"
        }, (res) => {
            // console.log("STATUS: " + res.statusCode);
            res.setEncoding("utf8");
            res.on("data", function (data) {
                let ct = res.headers["content-type"];
                if (res.statusCode === 201)
                    resoleve(parse(data, ct));
                else
                    reject(parse(data, ct, res.statusCode));
            });
        });
        req.on("error", (err) => reject(err));
        req.setHeader("content-Type", "application/json");
        if (token) req.setHeader("authorization", "Bearer " + token);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function put(path: string, domain: string, body: any, token?: string): Promise<any> {
    return new Promise<any>((resoleve, reject) => {
        let req = Http.request({
            hostname,
            path,
            port,
            method: "put"
        }, (res) => {
            // console.log("STATUS: " + res.statusCode);
            res.setEncoding("utf8");
            res.on("data", function (data) {
                let ct = res.headers["content-type"];
                if (res.statusCode === 201)
                    resoleve(parse(data, ct));
                else
                    reject(parse(data, ct, res.statusCode));
            });
        });
        req.on("error", (err) => reject(err));
        let ct = "application/json";
        if (domain) ct += "; domain-model=" + domain;
        req.setHeader("content-Type", ct);
        if (token) req.setHeader("authorization", "Bearer " + token);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function get(path: string, token?: string): Promise<any> {
    return new Promise<any>((resoleve, reject) => {
        let req = Http.request({
            hostname,
            path,
            port,
            method: "GET"
        }, (res) => {
            // console.log("STATUS: " + res.statusCode);
            res.setEncoding("utf8");
            res.on("data", function (data) {
                let ct = res.headers["content-type"];
                if (res.statusCode === 200)
                    resoleve(parse(data, ct));
                else
                    reject(parse(data, ct, res.statusCode));
            });
        });
        req.on("error", (err) => reject(err));
        if (token) req.setHeader("authorization", "Bearer " + token);
        req.end();
    });
}

function parse(data: string | Buffer, contentType: string, error?: number) {
    if (contentType.indexOf("/json") === -1) return data.toString();
    let json = JSON.parse(data.toString());
    if (error) {
        return { error, message: json.message };
    } else {
        return json;
    }
}
