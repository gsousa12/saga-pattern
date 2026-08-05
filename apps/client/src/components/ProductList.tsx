import { useState } from 'react';

import type { Product } from '../api/products';
import { useCheckout } from '../hooks/useCheckout';
import { useProducts } from '../hooks/useProducts';
import { CheckoutModal } from './CheckoutModal';
import { ProductCard } from './ProductCard';

export function ProductList() {
  const { data: products, isLoading, error } = useProducts();
  const checkoutMutation = useCheckout();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleCheckoutClick = (product: Product, quantity: number) => {
    setSelectedProduct(product);
    setSelectedQuantity(quantity);
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    checkoutMutation.reset();
  };

  const handleConfirmCheckout = () => {
    if (!selectedProduct) {
      return;
    }

    const idempotencyKey = `${selectedProduct.id}-${Date.now()}`;

    checkoutMutation.mutate(
      { idempotencyKey, productId: selectedProduct.id, quantity: selectedQuantity },
      {
        onSuccess: () => {
          setSelectedProduct(null);
          checkoutMutation.reset();
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-gray-600">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-red-600">Failed to load products.</p>
      </div>
    );
  }

  const hasProducts = products && products.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Products</h1>

        {!hasProducts && <p className="text-gray-600">No products available.</p>}

        {hasProducts && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} onCheckout={handleCheckoutClick} />
            ))}
          </div>
        )}
      </div>

      <CheckoutModal
        product={selectedProduct}
        quantity={selectedQuantity}
        isOpen={Boolean(selectedProduct)}
        isLoading={checkoutMutation.isPending}
        error={checkoutMutation.error}
        onClose={handleCloseModal}
        onConfirm={handleConfirmCheckout}
      />

      {checkoutMutation.isSuccess && (
        <div className="fixed bottom-4 right-4 rounded-md bg-green-600 px-4 py-3 text-white shadow-lg">
          Order created successfully!
        </div>
      )}
    </div>
  );
}
