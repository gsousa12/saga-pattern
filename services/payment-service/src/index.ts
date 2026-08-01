import { DEFAULTS, PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import { startPaymentWorker } from './workers/payment.worker';

const PORT = PORTS.PAYMENT_SERVICE;
const HOST = '0.0.0.0';

const app = fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      TOPICS.COMMAND_PROCESS_PAYMENT,
      TOPICS.REPLY_PAYMENT_SUCCESS,
      TOPICS.REPLY_PAYMENT_FAIL,
    ]);
    await startPaymentWorker();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Defaults loaded: ${DEFAULTS.DATABASE_URL}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
