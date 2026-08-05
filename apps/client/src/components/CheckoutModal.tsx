import type { Product } from '../api/products';

interface CheckoutModalProps {
  product: Product | null;
  quantity: number;
  isOpen: boolean;
  isLoading: boolean;
  error: Error | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function CheckoutModal({
  product,
  quantity,
  isOpen,
  isLoading,
  error,
  onClose,
  onConfirm,
}: CheckoutModalProps) {
  if (!isOpen || !product) {
    return null;
  }

  const totalPrice = product.price * quantity;
  const isConfirmDisabled = isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900">Confirm Checkout</h2>

        <div className="mt-4 space-y-2">
          <p className="text-gray-700">
            <span className="font-medium">Product:</span> {product.name}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Quantity:</span> {quantity}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Unit Price:</span> ${product.price.toFixed(2)}
          </p>
          <p className="text-lg font-bold text-gray-900">
            <span className="font-medium">Total:</span> ${totalPrice.toFixed(2)}
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error.message}</div>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4
            py-2 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none
            focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white
            hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500
            focus:ring-offset-2 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
