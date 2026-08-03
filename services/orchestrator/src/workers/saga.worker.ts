import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { getDbInstance } from '../_common/db';
import { createConsumer, getProducer, withRetry } from '../_common/kafka';

// --- Worker 1: Consome saga_start_checkout e inicia a saga ---
export async function startSagaWorker() {
  const consumer = await createConsumer('orchestrator-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.SAGA_START_CHECKOUT, fromBeginning: false });
    },
    { label: 'Kafka saga consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          console.log('SAGA_START_CHECKOUT payload', payload);

          const db = await getDbInstance();

          // Cria o registro de saga state
          await db.transaction(async (tx) => {
            await tx
              .insert(sagaStates)
              .values({
                idempotencyKey: payload.idempotencyKey,
                businessId: payload.order.id,
                currentStep: SagaStepEnum.PENDING_STOCK,
                payload: payload,
              });
          });

          // console.log(
          //   '[Orchestrator] saga_start_checkout received, saga_state created:',
          //   payload.idempotencyKey,
          // );

          // Publica comando para reservar stock
          const producer = await getProducer();
          await producer.send({
            topic: TOPICS.COMMAND_RESERVE_STOCK,
            messages: [
              {
                value: JSON.stringify({
                  idempotencyKey: payload.idempotencyKey,
                  order: payload.order,
                }),
              },
            ],
          });

          // console.log('[Orchestrator] command_reserve_stock published:', payload.idempotencyKey);
        },
      });
    },
    { label: 'Kafka saga consumer run' },
  );
}

// --- Worker 2: Consome reply_stock_reserved_success e avança para payment ---
export async function startStockSuccessWorker() {
  const consumer = await createConsumer('orchestrator-stock-success-group');

  await withRetry(
    async () => {
      await consumer.subscribe({
        topic: TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
        fromBeginning: false,
      });
    },
    { label: 'Kafka stock-success consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          const db = await getDbInstance();
          const producer = await getProducer();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.PENDING_PAYMENT })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          console.log(
            '[Orchestrator] reply_stock_reserved_success received, saga updated to pending_payment:',
            payload.idempotencyKey,
          );

          // Publica comando para processar pagamento
          await producer.send({
            topic: TOPICS.COMMAND_PROCESS_PAYMENT,
            messages: [
              {
                value: JSON.stringify({
                  idempotencyKey: payload.idempotencyKey,
                  order: payload.order,
                }),
              },
            ],
          });

          console.log('[Orchestrator] command_process_payment published:', payload.idempotencyKey);
        },
      });
    },
    { label: 'Kafka stock-success consumer run' },
  );
}

// --- Worker 3: Consome reply_stock_reserved_fail e marca saga como failed ---
export async function startStockFailWorker() {
  const consumer = await createConsumer('orchestrator-stock-fail-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_STOCK_RESERVED_FAIL, fromBeginning: false });
    },
    { label: 'Kafka stock-fail consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.FAILED })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          console.log(
            '[Orchestrator] reply_stock_reserved_fail received, saga marked as failed:',
            payload.idempotencyKey,
            '- reason:',
            payload.reason,
          );
        },
      });
    },
    { label: 'Kafka stock-fail consumer run' },
  );
}

// --- Worker 4: Consome reply_payment_success e marca saga como completed ---
export async function startPaymentSuccessWorker() {
  const consumer = await createConsumer('orchestrator-payment-success-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_PAYMENT_SUCCESS, fromBeginning: false });
    },
    { label: 'Kafka payment-success consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.COMPLETED })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          console.log(
            '[Orchestrator] reply_payment_success received, saga marked as completed:',
            payload.idempotencyKey,
          );
        },
      });
    },
    { label: 'Kafka payment-success consumer run' },
  );
}

// --- Worker 5: Consome reply_payment_fail e inicia rollback ---
export async function startPaymentFailWorker() {
  const consumer = await createConsumer('orchestrator-payment-fail-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_PAYMENT_FAIL, fromBeginning: false });
    },
    { label: 'Kafka payment-fail consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.ROLLBACKING_STOCK })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          console.log(
            '[Orchestrator] reply_payment_fail received, saga marked as rollbacking_stock:',
            payload.idempotencyKey,
            '- reason:',
            payload.reason,
          );

          // TODO: publicar command_release_stock para o stock service fazer rollback
        },
      });
    },
    { label: 'Kafka payment-fail consumer run' },
  );
}
