// oxlint-disable oxc/no-async-endpoint-handlers
import { PORTS, TOPICS } from '@orchestrator/constants';
import fastify from 'fastify';

import { ensureTopicsExist } from './_common/kafka';
import { clearNotifications, getNotifications, startNotificationWorker } from './workers';

const PORT = PORTS.NOTIFICATION_SERVICE;
const HOST = '0.0.0.0';

const app = fastify({ logger: true });

app.get('/health', async () => {
  return { status: 'ok' };
});

app.get('/notifications/:idempotencyKey', async (req) => {
  const { idempotencyKey } = req.params as { idempotencyKey: string };
  const items = getNotifications(idempotencyKey);
  return { idempotencyKey, notifications: items };
});

app.delete('/notifications/:idempotencyKey', async (req) => {
  const { idempotencyKey } = req.params as { idempotencyKey: string };
  clearNotifications(idempotencyKey);
  return { idempotencyKey, cleared: true };
});

const start = async () => {
  try {
    await ensureTopicsExist([TOPICS.SAGA_NOTIFICATION]);
    await startNotificationWorker();
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Notification service listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
