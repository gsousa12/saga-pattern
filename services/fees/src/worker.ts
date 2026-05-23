import { Worker } from '@temporalio/worker';
import * as activities from './activities/fees.activities.js';

async function run() {
  // Fees worker não hospeda workflows — apenas activities na fees-queue
  const worker = await Worker.create({
    activities,
    taskQueue: 'fees-queue',
  });

  console.log('[fees] Worker rodando na fees-queue...');
  await worker.run();
}

run().catch((err) => {
  console.error('[fees] Erro fatal no Worker:', err);
  process.exit(1);
});
