import { useGameStore } from '../store/gameStore';
import { NotificationType } from '../types';

const typeStyles: Record<NotificationType, { bg: string; border: string; text: string; icon: string }> = {
  info: {
    bg: 'bg-blue-950/95',
    border: 'border-blue-600',
    text: 'text-blue-200',
    icon: 'ℹ️',
  },
  warning: {
    bg: 'bg-yellow-950/95',
    border: 'border-yellow-600',
    text: 'text-yellow-200',
    icon: '⚠️',
  },
  danger: {
    bg: 'bg-red-950/95',
    border: 'border-red-600',
    text: 'text-red-200',
    icon: '💀',
  },
  success: {
    bg: 'bg-green-950/95',
    border: 'border-green-600',
    text: 'text-green-200',
    icon: '✅',
  },
};

export default function NotificationToast() {
  const { notifications, dismissNotification } = useGameStore(s => ({
    notifications: s.notifications,
    dismissNotification: s.dismissNotification,
  }));

  return (
    <div className="absolute top-10 right-36 sm:right-44 z-30 flex flex-col gap-1 pointer-events-auto max-w-[200px] sm:max-w-[280px]">
      {notifications.slice(0, 3).map(notif => {
        const style = typeStyles[notif.type];
        return (
          <div
            key={notif.id}
            className={`
              flex items-start gap-2 px-2 py-1.5 border-2
              ${style.bg} ${style.border} ${style.text}
              shadow-minecraft animate-fade-in
            `}
          >
            <span className="text-xs shrink-0 mt-0.5">{style.icon}</span>
            <span className="font-minecraft text-xs flex-1 leading-tight">{notif.message}</span>
            <button
              onClick={() => dismissNotification(notif.id)}
              className="shrink-0 text-gray-500 hover:text-white text-xs leading-none"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
