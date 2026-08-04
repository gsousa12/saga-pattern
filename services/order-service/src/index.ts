import { PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import { orderRouter } from './router/router';
import { startUpdateOrderStatusWorker } from './workers';

const PORT = PORTS.ORDER_SERVICE;
const HOST = '0.0.0.0';

const app = fastify({ logger: false });

app.get('/health', async () => {
  return { status: 'ok' };
});

app.register(orderRouter);

const start = async () => {
  try {
    await ensureTopicsExist([TOPICS.SAGA_START_CHECKOUT, TOPICS.SAGA_ORDER_STATUS_UPDATED]);
    await startUpdateOrderStatusWorker();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
