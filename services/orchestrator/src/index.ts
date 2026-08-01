import { PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import {
  startSagaWorker,
  startStockSuccessWorker,
  startStockFailWorker,
  startPaymentSuccessWorker,
  startPaymentFailWorker,
} from './workers/saga.worker';

const PORT = PORTS.ORCHESTRATOR;
const HOST = '0.0.0.0';

const app = fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      TOPICS.SAGA_START_CHECKOUT,
      TOPICS.COMMAND_RESERVE_STOCK,
      TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
      TOPICS.REPLY_STOCK_RESERVED_FAIL,
      TOPICS.COMMAND_PROCESS_PAYMENT,
      TOPICS.REPLY_PAYMENT_SUCCESS,
      TOPICS.REPLY_PAYMENT_FAIL,
    ]);

    await startSagaWorker();
    await startStockSuccessWorker();
    await startStockFailWorker();
    await startPaymentSuccessWorker();
    await startPaymentFailWorker();

    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
