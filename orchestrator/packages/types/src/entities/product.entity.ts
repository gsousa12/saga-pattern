export type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
