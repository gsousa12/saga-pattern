// oxlint-disable oxc/no-async-endpoint-handlers
import type { FastifyInstance } from 'fastify';

import { getNotifications, clearNotifications } from '../workers/notification.worker';

export async function notificationRouter(app: FastifyInstance) {
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
}
