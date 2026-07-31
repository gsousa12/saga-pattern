import { FastifyInstance } from "fastify";
import { z } from "zod";
import { getDbInstance } from "../../_common/db";
import { getProducer } from "../../_common/kafka";
import { orders } from "@orchestrator/db";

const createOrderBodySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
});

type CreateOrderBody = z.infer<typeof createOrderBodySchema>;

export async function ordersController(app: FastifyInstance) {
  app.get("/", async () => {
    const db = await getDbInstance();
    const allOrders = await db.select().from(orders);
    return { orders: allOrders };
  });

  app.post<{ Body: CreateOrderBody }>("/", async (req, reply) => {
    const body = createOrderBodySchema.parse(req.body);
    const producer = await getProducer();

    await producer.send({
      topic: "orders.create",
      messages: [
        {
          value: JSON.stringify({
            productId: body.productId,
            quantity: body.quantity,
            totalPrice: body.totalPrice,
          }),
        },
      ],
    });

    return reply.status(202).send({ message: "Order creation queued" });
  });
}
