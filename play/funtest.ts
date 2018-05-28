class A {
    m() {
        const handler = function (this: any, msg: string) {
            console.log(msg);
        };
        return handler;
    }
}

let a = new A();
let h = a.m();
h("Hello");