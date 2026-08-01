export const SagaStepEnum = {
  PENDING_STOCK: 'pending_stock',
  PENDING_PAYMENT: 'pending_payment',
  COMPLETED: 'completed',
  ROLLBACKING_STOCK: 'rollbacking_stock',
  FAILED: 'failed',
} as const;

export type SagaStepType = (typeof SagaStepEnum)[keyof typeof SagaStepEnum];

export const SAGA_STEP_VALUES = [
  'pending_stock',
  'pending_payment',
  'completed',
  'rollbacking_stock',
  'failed',
] as const;
