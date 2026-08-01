import { createConsumer, getProducer, withRetry } from "../_common/kafka";
import { getDbInstance } from "../_common/db";
import { sagaStates } from "@orchestrator/db";
import { SagaStepEnum } from "@orchestrator/enums";
import type { EachMessagePayload } from "kafkajs";

export async function startSagaWorker() {
  const consumer = await createConsumer("orchestrator-group");

  await withRetry(async () => {
    await consumer.subscribe({
      topic: "saga_start_checkout",
      fromBeginning: false,
    });
  }, { label: "Kafka saga consumer subscribe" });

  await withRetry(async () => {
    await consumer.run({
      eachMessage: async ({ message }: EachMessagePayload) => {
        if (!message.value) return;

        const payload = JSON.parse(message.value.toString());
        const db = await getDbInstance();

        // Cria o registro de saga state
        await db.transaction(async (tx) => {
          await tx.insert(sagaStates).values({
            idempotencyKey: payload.idempotencyKey,
            businessId: payload.order.id,
            currentStep: SagaStepEnum.PENDING_STOCK,
            payload: payload,
          });
        });

        console.log(
          "[Orchestrator] saga_start_checkout received, saga_state created:",
          payload.idempotencyKey,
        );

        // Publica comando para reservar stock
        const producer = await getProducer();
        await producer.send({
          topic: "command_reserve_stock",
          messages: [
            {
              value: JSON.stringify({
                idempotencyKey: payload.idempotencyKey,
                order: payload.order,
              }),
            },
          ],
        });

        console.log(
          "[Orchestrator] command_reserve_stock published:",
          payload.idempotencyKey,
        );
      },
    });
  }, { label: "Kafka saga consumer run" });
}
