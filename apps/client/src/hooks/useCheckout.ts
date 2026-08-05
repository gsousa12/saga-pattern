import { useMutation } from '@tanstack/react-query';

import { checkout, type CheckoutPayload } from '../api/checkout';

export function useCheckout() {
  return useMutation({ mutationFn: (payload: CheckoutPayload) => checkout(payload) });
}
