export type ExchangeOrder = {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  convertedAmount: number;
  fees: number;
  rate: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  workflowId: string;
  createdAt: Date;
};

export type StartExchangeInput = {
  from: string;
  to: string;
  amount: number;
  idempotencyKey: string;
};
