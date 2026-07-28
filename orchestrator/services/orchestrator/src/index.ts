import fastify from 'fastify';
import { User } from '@orchestrator/types';
import { connectDb, db } from './db';
import { orders } from './db/schema';

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
  const allOrders = await db.select().from(orders);
  return { orders: allOrders };
});

const start = async () => {
  try {
    await connectDb();
    await app.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
