import { createConsumer, getProducer } from "../_common/kafka";
import { getDbInstance } from "../_common/db";
import { orders } from "@orchestrator/db";

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 15,
  baseDelay = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * (i + 1);
      console.log(
        `Kafka consumer setup attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function startOrderWorker() {
  const consumer = await createConsumer("order-service-group");

  await retry(async () => {
    await consumer.subscribe({ topic: "orders.create", fromBeginning: false });
  });

  await retry(async () => {
    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        const payload = JSON.parse(message.value.toString());
        const db = await getDbInstance();

        const [order] = await db
          .insert(orders)
          .values({
            productId: payload.productId,
            quantity: payload.quantity,
            totalPrice: payload.totalPrice,
          })
          .returning();

        const producer = await getProducer();
        await producer.send({
          topic: "orders.created",
          messages: [{ value: JSON.stringify(order) }],
        });
      },
    });
  });
}
