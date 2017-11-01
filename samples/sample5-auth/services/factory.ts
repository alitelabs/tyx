
import {
    Service,
    Command,
    Query,
    Get,
    Post,
    Put,
    Delete,
    ContextParam,
    PathParam,
    BodyParam,
    Body,
    BadRequest,
    NotFound,
    Utils
} from "../../../src";

import {
    AppRoles
} from "../api/app";

import {
    FactoryApi,
    Product,
    Response,
    Confirmation,
    Item,
    Status
} from "../api/factory";

@Service(FactoryApi)
export class FactoryService implements FactoryApi {

    private products: Record<string, Product> = {};

    // Admin only

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Post("/reset")
    public async reset(
        @ContextParam("auth.userId") userId: string): Promise<Response> {
        this.products = {};
        return { userId, role: "Admin", status: "Reset" };
    }

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Post("/product")
    public async createProduct(
        @ContextParam("auth.userId") userId: string,
        @BodyParam("id") productId: string,
        @BodyParam("name") name: string): Promise<Confirmation> {

        if (this.products[productId]) throw new BadRequest("Duplicate product");
        let product = { productId, name, creator: userId, production: false, orders: [] };
        this.products[productId] = product;
        return { userId, role: "Admin", status: "Create product", product };
    }

    @Command<AppRoles>({ Admin: true, Manager: false, Operator: false })
    @Delete("/product/{id}")
    public async removeProduct(
        @ContextParam("auth.userId") userId: string,
        @PathParam("id") productId: string): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        delete this.products[productId];
        return { userId, role: "Admin", status: "Remove product", product };
    }

    // Admin & Manager

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: false })
    @Put("/product/{id}", true)
    public async startProduction(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string,
        @Body() order: any): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        product.production = true;
        product.orders.push(order);
        return { userId, role, status: "Production started", product, order };
    }

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: false })
    @Put("/product/{id}", true)
    public async stopProduction(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string,
        @Body() order: any): Promise<Confirmation> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        product.production = false;
        product.orders.push(order);
        return { userId, role, status: "Production stopped", product, order };
    }

    // + Operator

    @Command<AppRoles>({ Admin: true, Manager: true, Operator: true })
    @Get("/product/{id}")
    public async produce(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string,
        @PathParam("id") productId: string): Promise<Item> {

        let product = this.products[productId];
        if (!product) throw new NotFound("Product not found");
        if (!product.production) throw new BadRequest("Product not in production");
        let item: Item = {
            userId, role,
            status: "Item produced",
            product,
            itemId: Utils.uuid(),
            timestamp: new Date().toISOString()
        };
        return item;
    }

    @Query<AppRoles>({ Public: true, Admin: true, Manager: true, Operator: true })
    @Get("/status")
    public async status(
        @ContextParam("auth.userId") userId: string,
        @ContextParam("auth.role") role: string): Promise<Status> {

        let products = [];
        Object.keys(this.products).forEach(k => products.push(this.products[k]));
        return { userId, role, status: "Status", products };
    }
}