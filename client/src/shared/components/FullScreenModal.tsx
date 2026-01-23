import type { ReactNode } from 'react';
import { haptic } from '../helpers';

interface FullScreenModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function FullScreenModal({ title, onClose, children }: FullScreenModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white h-screen flex flex-col overflow-hidden max-w-[430px] mx-auto left-1/2 -translate-x-1/2">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 min-h-[64px] bg-white">
        <button
          onClick={() => {
            haptic('light');
            onClose();
          }}
          className="w-11 h-11 rounded-full border-none bg-gray-100 cursor-pointer flex items-center justify-center text-gray-500 hover:bg-gray-200"
          aria-label="סגור"
        >
          ✕
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center">{title}</h1>
        <div className="w-11" /> {/* Spacer for centering */}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-5 pb-8">
        {children}
      </div>
    </div>
  );
}
