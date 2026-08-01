export const SagaTypeEnum = { CHECKOUT_PROCESS: 'checkout_process' } as const;

export type SagaTypeType = (typeof SagaTypeEnum)[keyof typeof SagaTypeEnum];

export const SAGA_TYPE_VALUES = ['checkout_process'] as const;
