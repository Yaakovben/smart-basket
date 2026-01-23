import type { ToastType } from '../types';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
}

const toastConfig: Record<ToastType, { icon: string; bgClass: string }> = {
  success: { icon: '✓', bgClass: 'bg-gradient-to-br from-green-500 to-green-600' },
  error: { icon: '✕', bgClass: 'bg-gradient-to-br from-red-500 to-red-600' },
  info: { icon: 'ℹ', bgClass: 'bg-gradient-to-br from-teal-500 to-teal-600' }
};

export function Toast({ message, type = 'success', visible }: ToastProps) {
  if (!message || !visible) return null;

  const config = toastConfig[type];

  return (
    <div
      className={`fixed bottom-6 left-5 ${config.bgClass} text-white px-4 py-3 rounded-xl text-sm font-semibold z-[9999] pointer-events-none shadow-lg animate-slideInLeft flex items-center gap-2.5 max-w-[calc(100vw-40px)]`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="text-lg flex-shrink-0">{config.icon}</span>
      <span>{message}</span>
    </div>
  );
}
