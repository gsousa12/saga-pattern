import { useState } from 'react';

import type { Product } from '../api/products';

interface ProductCardProps {
  product: Product;
  onCheckout: (product: Product, quantity: number) => void;
}

export function ProductCard({ product, onCheckout }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const hasImage = Boolean(product.image);

  const handleCheckout = () => {
    onCheckout(product, quantity);
  };

  const increment = () => {
    setQuantity((prev) => prev + 1);
  };

  const decrement = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-gray-100">
        {hasImage ? (
          <img
            src={product.image!}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-gray-400">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.description}</p>
        <p className="mt-2 text-xl font-bold text-gray-900">${product.price.toFixed(2)}</p>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={decrement}
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            -
          </button>
          <span className="w-8 text-center font-medium">{quantity}</span>
          <button
            type="button"
            onClick={increment}
            className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={handleCheckout}
          className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Checkout
        </button>
      </div>
    </div>
  );
}
