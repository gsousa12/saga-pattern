import { OrderStatusType } from '@orchestrator/enums';

export type Order = {
  id: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatusType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
