import type { FastifyInstance } from 'fastify';

import { checkout } from '../controller/orders.controller';

export async function orderRouter(app: FastifyInstance) {
  app.post('/checkout', checkout);
}
