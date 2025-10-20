import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import BankSelectionModal from '../components/BankSelectionModal';

class BankModalService {
  private static modalRoot: HTMLElement | null = null;
  private static reactRoot: Root | null = null;

  static async showBankSelection(): Promise<string | null> {
    return new Promise((resolve) => {
      // Create modal container
      this.modalRoot = document.createElement('div');
      this.modalRoot.id = 'bank-selection-modal-root';
      document.body.appendChild(this.modalRoot);

      // Create React root
      this.reactRoot = createRoot(this.modalRoot);

      const handleClose = () => {
        this.cleanup();
        resolve(null);
      };

      const handleSelectBank = (bankCode: string) => {
        this.cleanup();
        resolve(bankCode);
      };

      // Render modal
      const modalElement = React.createElement(BankSelectionModal, {
        isOpen: true,
        onClose: handleClose,
        onSelectBank: handleSelectBank,
        theme: 'auto' as const
      });
      
      this.reactRoot.render(modalElement);
    });
  }

  private static cleanup() {
    if (this.reactRoot) {
      // Unmount the component
      setTimeout(() => {
        if (this.reactRoot) {
          this.reactRoot.unmount();
          this.reactRoot = null;
        }
        if (this.modalRoot && document.body.contains(this.modalRoot)) {
          document.body.removeChild(this.modalRoot);
          this.modalRoot = null;
        }
      }, 200); // Small delay to allow exit animations
    }
  }
}

export { BankModalService };