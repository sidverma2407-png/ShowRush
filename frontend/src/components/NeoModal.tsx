import React from 'react';
import { useModalStore } from '../store/modal';

export const NeoModal: React.FC = () => {
  const { isOpen, options, closeModal } = useModalStore();

  if (!isOpen || !options) return null;

  const { title, message, type = 'info', buttonText, confirmText, cancelText, onConfirm, isConfirm } = options;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  const getHeaderStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-amber-400 text-on-background border-b-4 border-on-background';
      case 'error':
        return 'bg-red-500 text-white border-b-4 border-on-background';
      case 'warning':
        return 'bg-amber-300 text-on-background border-b-4 border-on-background';
      default:
        return 'bg-cyan-400 text-on-background border-b-4 border-on-background';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-on-background/85 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md bg-surface border-4 border-on-background neo-brutalism-shadow rounded-xl overflow-hidden flex flex-col relative blueprint-bg transform transition-transform scale-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Bar */}
        <div className={`p-4 flex items-center justify-between ${getHeaderStyles()}`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl font-black">{getIcon()}</span>
            <h3 className="font-headline-lg-mobile text-lg font-black uppercase tracking-tight">
              {title}
            </h3>
          </div>
          <button 
            onClick={closeModal}
            className="w-8 h-8 flex items-center justify-center bg-on-background text-white border-2 border-on-background hover:bg-surface hover:text-on-background font-black transition-colors"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-primary-container/40 border-2 border-on-background p-4 rounded-lg">
            <p className="font-body-md text-on-background font-bold text-base leading-relaxed break-words whitespace-pre-line">
              {message}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            {isConfirm ? (
              <>
                <button
                  onClick={closeModal}
                  className="px-5 py-2.5 bg-surface text-on-surface border-2 border-on-background neo-brutalist-shadow hover:bg-slate-200 transition-all font-black text-xs uppercase tracking-wider"
                >
                  {cancelText || 'CANCEL'}
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2.5 bg-on-background text-on-primary border-2 border-on-background neo-brutalist-shadow hover:bg-primary-fixed hover:text-on-background transition-all font-black text-xs uppercase tracking-wider"
                >
                  {confirmText || 'PROCEED'}
                </button>
              </>
            ) : (
              <button
                onClick={closeModal}
                className="w-full py-3 bg-primary-fixed text-on-background border-4 border-on-background neo-brutalism-shadow hover:bg-on-background hover:text-primary-fixed transition-all font-black text-sm uppercase tracking-wider"
              >
                {buttonText || 'OK'}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Neo Accent Strip */}
        <div className="h-2 bg-on-background w-full"></div>
      </div>
    </div>
  );
};
