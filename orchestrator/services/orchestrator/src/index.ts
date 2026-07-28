import fastify from 'fastify';
import { User } from '@orchestrator/types';
import { createDb, orders } from '@orchestrator/db';

const app = fastify({ logger: true });

app.get('/health', async () => {
  const user: User = {
    id: '0',
    name: 'Orchestrator Health User',
    email: 'orchestrator@orchestrator.local',
  };

  return { status: 'ok', user };
});

app.get('/orders', async () => {
  const db = await createDb(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orchestrator');
  const allOrders = await db.select().from(orders);
  return { orders: allOrders };
});

const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
