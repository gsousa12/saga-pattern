export const TOPICS = {
  SAGA_START_CHECKOUT: "saga_start_checkout",
  COMMAND_RESERVE_STOCK: "command_reserve_stock",
} as const;

export const DEFAULTS = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/orchestrator",
  KAFKA_BROKERS: "localhost:9092",
  ORDER_SERVICE_URL: "http://localhost:3001",
} as const;


export const PORTS = {
  CLIENT: 3000,
  GATEWAY: 3001,
  ORCHESTRATOR: 3002,
  ORDER_SERVICE: 3003,
  STOCK_SERVICE: 3004,
  PAYMENT_SERVICE: 3005,
  NOTIFICATION_SERVICE: 3006,
}
