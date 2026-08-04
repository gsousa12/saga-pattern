/**
 * Topics used for communication between services in the orchestrator pattern.
 */
export const TOPICS = {
  /**
   * Topic for starting the checkout process in the orchestrator.
   */
  SAGA_START_CHECKOUT: 'saga_start_checkout',
  COMMAND_RESERVE_STOCK: 'command_reserve_stock',
  REPLY_STOCK_RESERVED_SUCCESS: 'reply_stock_reserved_success',
  REPLY_STOCK_RESERVED_FAIL: 'reply_stock_reserved_fail',
  COMMAND_PROCESS_PAYMENT: 'command_process_payment',
  REPLY_PAYMENT_SUCCESS: 'reply_payment_success',
  REPLY_PAYMENT_FAIL: 'reply_payment_fail',
  COMMAND_RELEASE_STOCK: 'command_release_stock',
  REPLY_STOCK_RELEASED_SUCCESS: 'reply_stock_released_success',
  SAGA_ORDER_STATUS_UPDATED: 'saga_order_status_updated',
} as const;

export const DEFAULTS = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/orchestrator',
  KAFKA_BROKERS: 'localhost:9092',
  ORDER_SERVICE_URL: 'http://localhost:3003',
} as const;

export const PORTS = {
  CLIENT: 3000,
  GATEWAY: 3001,
  ORCHESTRATOR: 3002,
  ORDER_SERVICE: 3003,
  STOCK_SERVICE: 3004,
  PAYMENT_SERVICE: 3005,
  NOTIFICATION_SERVICE: 3006,
} as const;
