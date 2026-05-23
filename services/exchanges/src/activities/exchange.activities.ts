import { db, orders } from '@saga/database';

export async function fetchExchangeRate(from: string, to: string): Promise<number> {
  // Simula chamada a uma API externa de câmbio (ex: Open Exchange Rates)
  // Em produção, substituir por: const res = await fetch(`https://api.exchangerate.host/...`)
  const mockRates: Record<string, number> = {
    'USD-BRL': 5.2,
    'EUR-BRL': 5.7,
    'USD-EUR': 0.92,
    'BRL-USD': 0.19,
  };

  const key = `${from}-${to}`;
  const rate = mockRates[key];

  if (!rate) throw new Error(`Pair ${key} not supported`);

  return rate;
}

export async function saveOrder(order: {
  fromCurrency: string;
  toCurrency: string;
  amount: string;
  convertedAmount: string;
  fees: string;
  rate: string;
  workflowId: string;
}): Promise<string> {
  const [saved] = await db
    .insert(orders)
    .values({ ...order, status: 'COMPLETED' })
    .returning({ id: orders.id });

  return saved.id;
}
