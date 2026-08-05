import { api } from './axios';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export async function fetchProducts(): Promise<Product[]> {
  const { data } = await api.get<{ products: Product[] }>('/products');
  return data.products;
}
