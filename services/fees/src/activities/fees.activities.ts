// Regra de negócio de taxas: 1% do amount, mínimo de $0.50
export async function calculateFees(amount: number): Promise<number> {
  const percentage = 0.01;
  const minimum = 0.5;
  const calculated = amount * percentage;
  return Math.max(calculated, minimum);
}
