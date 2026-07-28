import fastify from 'fastify';
import { User } from '@orchestrator/types';

const app = fastify({ logger: true });

app.get('/health', async () => {
  const user: User = {
    id: '4',
    name: 'Notification Health User',
    email: 'notification@orchestrator.local',
  };

  return { status: 'ok', user };
});

const start = async () => {
  try {
    await app.listen({ port: 3004, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
