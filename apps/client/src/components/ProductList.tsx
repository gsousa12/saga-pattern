import { useState } from 'react';

import type { Product } from '../api/products';
import { useCheckout } from '../hooks/useCheckout';
import { useNotifications } from '../hooks/useNotifications';
import { useProducts } from '../hooks/useProducts';
import { CheckoutModal } from './CheckoutModal';
import { ProductCard } from './ProductCard';
import { SagaStatusModal } from './SagaStatusModal';

export function ProductList() {
  const { data: products, isLoading, error } = useProducts();
  const checkoutMutation = useCheckout();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [activeIdempotencyKey, setActiveIdempotencyKey] = useState<string | null>(null);
  const [sagaModalOpen, setSagaModalOpen] = useState(false);

  const { data: notificationsData, isLoading: notificationsLoading } =
    useNotifications(activeIdempotencyKey);

  const handleCheckoutClick = (product: Product, quantity: number) => {
    setSelectedProduct(product);
    setSelectedQuantity(quantity);
  };

  const handleCloseCheckoutModal = () => {
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
          setActiveIdempotencyKey(idempotencyKey);
          setSagaModalOpen(true);
          checkoutMutation.reset();
        },
        onError: () => {
          setSelectedProduct(null);
          setActiveIdempotencyKey(idempotencyKey);
          setSagaModalOpen(true);
        },
      },
    );
  };

  const handleCloseSagaModal = () => {
    setSagaModalOpen(false);
    setActiveIdempotencyKey(null);
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
        onClose={handleCloseCheckoutModal}
        onConfirm={handleConfirmCheckout}
      />

      <SagaStatusModal
        isOpen={sagaModalOpen}
        idempotencyKey={activeIdempotencyKey}
        notifications={notificationsData?.notifications || []}
        isLoading={notificationsLoading}
        onClose={handleCloseSagaModal}
      />
    </div>
  );
}
