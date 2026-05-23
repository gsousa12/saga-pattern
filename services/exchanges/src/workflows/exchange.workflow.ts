import { proxyActivities } from '@temporalio/workflow';

// Interfaces declaradas aqui — o workflow não pode importar os arquivos de activities
// diretamente (eles usam I/O), mas pode referenciar os tipos via interface.
interface ExchangeActivities {
  fetchExchangeRate(from: string, to: string): Promise<number>;
  saveOrder(order: {
    fromCurrency: string;
    toCurrency: string;
    amount: string;
    convertedAmount: string;
    fees: string;
    rate: string;
    workflowId: string;
  }): Promise<string>;
}

interface FeesActivities {
  calculateFees(amount: number): Promise<number>;
}

// Activities locais — rodadas pelo exchanges worker na exchange-queue
const { fetchExchangeRate, saveOrder } = proxyActivities<ExchangeActivities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

// Activities do fees service — roteadas para a fees-queue
const { calculateFees } = proxyActivities<FeesActivities>({
  taskQueue: 'fees-queue',
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

export async function exchangeWorkflow(input: {
  from: string;
  to: string;
  amount: number;
  workflowId: string;
}): Promise<{ orderId: string; rate: number; fees: number; convertedAmount: number }> {
  const { from, to, amount, workflowId } = input;

  // 1. Calcular taxas (fees service)
  const fees = await calculateFees(amount);

  // 2. Buscar cotação (exchanges service)
  const rate = await fetchExchangeRate(from, to);

  const netAmount = amount - fees;
  const convertedAmount = netAmount * rate;

  // 3. Persistir a ordem (exchanges service)
  const orderId = await saveOrder({
    fromCurrency: from,
    toCurrency: to,
    amount: amount.toString(),
    convertedAmount: convertedAmount.toString(),
    fees: fees.toString(),
    rate: rate.toString(),
    workflowId,
  });

  return { orderId, rate, fees, convertedAmount };
}
