import fastify from 'fastify';
import { User } from '@orchestrator/types';

const app = fastify({ logger: true });

app.get('/health', async () => {
  const user: User = {
    id: '3',
    name: 'Stock Health User',
    email: 'stock@orchestrator.local',
  };

  return { status: 'ok', user };
});

const start = async () => {
  try {
    await app.listen({ port: 3003, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
