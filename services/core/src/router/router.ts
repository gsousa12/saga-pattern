import type { FastifyInstance } from 'fastify';
import { exchangeController } from '../_modules/exchange/http/exchange.controller.js';

export async function router(app: FastifyInstance) {
  await app.register(exchangeController);
}
