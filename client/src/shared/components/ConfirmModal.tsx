import { haptic } from '../helpers';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export function ConfirmModal({ title, message, onConfirm, onCancel, confirmText = 'אישור' }: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn"
      onClick={onCancel}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        className="bg-white rounded-2xl p-6 w-[90%] max-w-[320px] animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-gray-900 mb-3 text-center">{title}</h3>
        <p className="text-base text-gray-500 mb-6 text-center">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              haptic('light');
              onCancel();
            }}
            className="flex-1 py-3.5 px-4 rounded-xl border-2 border-gray-200 bg-white text-base font-semibold cursor-pointer min-h-[48px] hover:bg-gray-50"
          >
            ביטול
          </button>
          <button
            onClick={() => {
              haptic('medium');
              onConfirm();
            }}
            className="flex-1 py-3.5 px-4 rounded-xl border-none bg-gradient-to-br from-red-500 to-red-600 text-white text-base font-semibold cursor-pointer shadow-lg min-h-[48px] hover:opacity-90"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
