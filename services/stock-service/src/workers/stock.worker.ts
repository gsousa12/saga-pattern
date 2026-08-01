import { createConsumer, withRetry } from "../_common/kafka";
import type { EachMessagePayload } from "kafkajs";

export async function startStockWorker() {
  const consumer = await createConsumer("stock-service-group");

  await withRetry(async () => {
    await consumer.subscribe({
      topic: "command_reserve_stock",
      fromBeginning: false,
    });
  }, { label: "Kafka stock consumer subscribe" });

  await withRetry(async () => {
    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;

        const payload = JSON.parse(message.value.toString());
        console.log(
          "[Stock Service] command_reserve_stock received:",
          payload,
        );
        // TODO: implement stock reservation
      },
    });
  }, { label: "Kafka stock consumer run" });
}
