import type { FastifyInstance } from 'fastify';
import { getTemporalClient } from '@saga/temporal';
import type { StartExchangeInput } from '@saga/types';

export async function exchangeController(app: FastifyInstance) {
  app.post<{ Body: Omit<StartExchangeInput, 'idempotencyKey'> }>(
    '/exchange',
    async (request, reply) => {
      const { from, to, amount } = request.body;
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      if (!idempotencyKey) {
        return reply.status(400).send({ error: 'Idempotency-Key header is required' });
      }

      const workflowId = `exchange-${idempotencyKey}`;
      const client = await getTemporalClient();

      const handle = await client.workflow.start('exchangeWorkflow', {
        args: [{ from, to, amount, workflowId }],
        taskQueue: 'exchange-queue',
        workflowId,
        // Se workflowId já existir, o Temporal retorna o handle existente (idempotência nativa)
      });

      return reply.status(202).send({
        workflowId: handle.workflowId,
        message: 'Exchange order accepted and being processed',
      });
    },
  );
}
