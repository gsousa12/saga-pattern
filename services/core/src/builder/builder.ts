import Fastify from 'fastify';
import { router } from '../router/router.js';

const app = Fastify({ logger: true });

export async function builder() {
  await app.register(router);
  await app.listen({ port: 3000, host: '0.0.0.0' });
  app.log.info('Core service listening on http://localhost:3000');
}
