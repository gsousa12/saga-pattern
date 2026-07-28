export const OrderStatusEnum = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatusType =
  (typeof OrderStatusEnum)[keyof typeof OrderStatusEnum];

export const ORDER_STATUS_VALUES = [
  'pending',
  'completed',
  'cancelled',
] as const;
