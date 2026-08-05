import { api } from './axios';

export interface SagaNotification {
  status: string;
  message: string;
  timestamp: string;
}

export interface NotificationsResponse {
  idempotencyKey: string;
  notifications: SagaNotification[];
}

export async function fetchNotifications(idempotencyKey: string): Promise<NotificationsResponse> {
  const { data } = await api.get<NotificationsResponse>(`/notifications/${idempotencyKey}`);
  return data;
}
