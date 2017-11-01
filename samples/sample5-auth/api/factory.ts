
export const FactoryApi = "factory";

export interface FactoryApi {
    // Admin only
    reset(userId: string): Promise<Response>;
    createProduct(userId: string, productId: string, name: string): Promise<Confirmation>;
    removeProduct(userId: string, productId: string): Promise<Confirmation>;

    // Admin & Manager
    startProduction(userId: string, role: string, productId: string, order: any): Promise<Confirmation>;
    stopProduction(userId: string, role: string, productId: string, order: any): Promise<Confirmation>;

    // Operator
    produce(userId: string, role: string, productId: string): Promise<Item>;

    // Public
    status(userId: string, role: string): Promise<Status>;
}

export interface Response {
    userId: string;
    role: string;
    status: string;
}

export interface Product {
    productId: string;
    name: string;
    creator: string;
    production: boolean;
    orders: any[];
}

export interface Confirmation extends Response {
    product: Product;
    order?: any;
}

export interface Item extends Response {
    product: Product;
    itemId: string;
    timestamp: string;
}

export interface Status extends Response {
    products: Product[];
}

