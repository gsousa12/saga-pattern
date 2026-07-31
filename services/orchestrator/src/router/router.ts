import { FastifyInstance } from "fastify";
import { ordersController } from "../modules/orders/orders.controller";
import { productsController } from "../modules/products/products.controller";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(ordersController, { prefix: "/orders" });
  await app.register(productsController, { prefix: "/products" });
}
