import { PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import { startStockWorker, startReleaseStockWorker } from './workers';

const PORT = PORTS.STOCK_SERVICE;
const HOST = '0.0.0.0';

const app = fastify({ logger: false });

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      TOPICS.COMMAND_RESERVE_STOCK,
      TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
      TOPICS.REPLY_STOCK_RESERVED_FAIL,
      TOPICS.COMMAND_RELEASE_STOCK,
      TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
    ]);
    await startStockWorker();
    await startReleaseStockWorker();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
