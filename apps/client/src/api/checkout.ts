import { api } from './axios';

export interface CheckoutPayload {
  idempotencyKey: string;
  productId: string;
  quantity: number;
}

export interface CheckoutResponse {
  message: string;
  order: {
    id: string;
    productId: string;
    quantity: number;
    totalPrice: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
}

export async function checkout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  const { data } = await api.post<CheckoutResponse>('/checkout', payload);
  return data;
}
