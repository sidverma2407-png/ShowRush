import { create } from 'zustand';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

export interface ModalOptions {
  title?: string;
  message: string;
  type?: ModalType;
  buttonText?: string;
  onClose?: () => void;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  isConfirm?: boolean;
}

interface ModalState {
  isOpen: boolean;
  options: ModalOptions | null;
  showAlert: (message: string, options?: Partial<ModalOptions>) => void;
  showSuccess: (message: string, options?: Partial<ModalOptions>) => void;
  showError: (message: string, options?: Partial<ModalOptions>) => void;
  showConfirm: (message: string, onConfirm: () => void, options?: Partial<ModalOptions>) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalState>((set, get) => ({
  isOpen: false,
  options: null,

  showAlert: (message, options = {}) => {
    set({
      isOpen: true,
      options: {
        title: options.title || 'NOTICE',
        message,
        type: options.type || 'info',
        buttonText: options.buttonText || 'GOT IT',
        onClose: options.onClose,
        isConfirm: false
      }
    });
  },

  showSuccess: (message, options = {}) => {
    set({
      isOpen: true,
      options: {
        title: options.title || 'SUCCESS',
        message,
        type: 'success',
        buttonText: options.buttonText || 'CONTINUE',
        onClose: options.onClose,
        isConfirm: false
      }
    });
  },

  showError: (message, options = {}) => {
    set({
      isOpen: true,
      options: {
        title: options.title || 'ERROR',
        message,
        type: 'error',
        buttonText: options.buttonText || 'DISMISS',
        onClose: options.onClose,
        isConfirm: false
      }
    });
  },

  showConfirm: (message, onConfirm, options = {}) => {
    set({
      isOpen: true,
      options: {
        title: options.title || 'CONFIRM ACTION',
        message,
        type: options.type || 'warning',
        confirmText: options.confirmText || 'YES, PROCEED',
        cancelText: options.cancelText || 'CANCEL',
        onConfirm,
        isConfirm: true
      }
    });
  },

  closeModal: () => {
    const { options } = get();
    if (options?.onClose) {
      options.onClose();
    }
    set({ isOpen: false, options: null });
  }
}));
