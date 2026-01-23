import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50 animate-fadeIn"
      onClick={onClose}
      onTouchMove={(e) => e.preventDefault()}
    >
      <div
        className="bg-white rounded-t-3xl w-full max-w-[430px] max-h-[75vh] overflow-y-auto overflow-x-hidden p-5 pb-8 animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <h2 className="text-lg font-bold text-center mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
