import { Worker } from '@temporalio/worker';
import { join } from 'node:path';
import * as activities from './activities/exchange.activities.js';

async function run() {
  const worker = await Worker.create({
    workflowsPath: join(__dirname, 'workflows/exchange.workflow.ts'),
    activities,
    taskQueue: 'exchange-queue',
  });

  console.log('[exchanges] Worker rodando na exchange-queue...');
  await worker.run();
}

run().catch((err) => {
  console.error('[exchanges] Erro fatal no Worker:', err);
  process.exit(1);
});
