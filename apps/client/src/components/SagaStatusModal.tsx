import type { SagaNotification } from '../api/notifications';

interface SagaStatusModalProps {
  isOpen: boolean;
  idempotencyKey: string | null;
  notifications: SagaNotification[];
  isLoading: boolean;
  onClose: () => void;
}

function getStatusColor(status: string): string {
  const statusLower = status.toLowerCase();
  const isCompleted = statusLower === 'completed';
  const isFailed = statusLower === 'failed';
  const isSuccess = statusLower.includes('success') || statusLower === 'stock_reserved';

  if (isCompleted) {
    return 'bg-green-100 text-green-800';
  }
  if (isFailed) {
    return 'bg-red-100 text-red-800';
  }
  if (isSuccess) {
    return 'bg-green-50 text-green-700';
  }
  return 'bg-blue-50 text-blue-700';
}

function isTerminalStatus(status: string): boolean {
  const terminalStatuses = ['completed', 'failed', 'cancelled'];
  return terminalStatuses.includes(status.toLowerCase());
}

export function SagaStatusModal({
  isOpen,
  idempotencyKey,
  notifications,
  isLoading,
  onClose,
}: SagaStatusModalProps) {
  if (!isOpen) {
    return null;
  }

  const hasNotifications = notifications.length > 0;
  const lastNotification = hasNotifications ? notifications[notifications.length - 1] : null;
  const isFinished = lastNotification ? isTerminalStatus(lastNotification.status) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Order Status</h2>
          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <span className="text-2xl">&times;</span>
            </button>
          )}
        </div>

        {idempotencyKey && <p className="mt-1 text-xs text-gray-500">ID: {idempotencyKey}</p>}

        <div className="mt-4 max-h-80 overflow-y-auto rounded-md border border-gray-200">
          {!hasNotifications && isLoading && (
            <div className="flex items-center justify-center p-8">
              <p className="text-gray-600">Waiting for updates...</p>
            </div>
          )}

          {!hasNotifications && !isLoading && (
            <div className="flex items-center justify-center p-8">
              <p className="text-gray-600">No updates yet.</p>
            </div>
          )}

          {hasNotifications && (
            <ul className="divide-y divide-gray-100">
              {notifications.map((notification, index) => {
                const isLatest = index === notifications.length - 1;
                return (
                  <li
                    key={`${notification.timestamp}-${index}`}
                    className={`flex items-start gap-3 p-3 ${isLatest ? 'bg-gray-50' : ''}`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(notification.status)}`}
                    >
                      {notification.status}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {new Date(notification.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isFinished && (
          <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Processing your order...
          </div>
        )}

        {isFinished && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
