import { PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import { startStockWorker } from './workers';

const PORT = PORTS.STOCK_SERVICE;
const HOST = '0.0.0.0';

const app = fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      TOPICS.COMMAND_RESERVE_STOCK,
      TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
      TOPICS.REPLY_STOCK_RESERVED_FAIL,
    ]);
    await startStockWorker();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
