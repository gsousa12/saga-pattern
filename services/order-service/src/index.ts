import fastify from "fastify";
import { z } from "zod";
import { startOrderWorker } from "./workers/order.worker";
import { ensureTopicsExist, getProducer } from "./_common/kafka";
import { getDbInstance } from "./_common/db";
import { orders } from "@orchestrator/db";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const checkoutBodySchema = z.object({
  idempotencyKey: z.string().min(1),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

app.post("/checkout", async (req, reply) => {
  const body = checkoutBodySchema.parse(req.body);
  const db = await getDbInstance();

  // buscar o preço do produto - por enquanto mock
  const totalPrice = body.quantity * 100; // mock price

  const order = await db.transaction(async (tx) => {
    const [result] = await tx
      .insert(orders)
      .values({
        productId: body.productId,
        quantity: body.quantity,
        totalPrice,
      })
      .returning();
    return result;
  });

  const producer = await getProducer();
  await producer.send({
    topic: "saga_start_checkout",
    messages: [
      {
        value: JSON.stringify({
          idempotencyKey: body.idempotencyKey,
          order,
        }),
      },
    ],
  });

  return reply.status(202).send({ message: "Order created", order });
});

const start = async () => {
  try {
    await ensureTopicsExist([
      "saga_start_checkout",
    ]);
    await startOrderWorker();
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
