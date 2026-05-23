export interface Order {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  items: OrderItem[];
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export type OrderStatus = Order["status"];
