import { useQuery } from '@tanstack/react-query';

import { fetchNotifications } from '../api/notifications';

const POLLING_INTERVAL = 1500;

export function useNotifications(idempotencyKey: string | null) {
  return useQuery({
    queryKey: ['notifications', idempotencyKey],
    queryFn: () => fetchNotifications(idempotencyKey!),
    enabled: Boolean(idempotencyKey),
    refetchInterval: POLLING_INTERVAL,
  });
}
