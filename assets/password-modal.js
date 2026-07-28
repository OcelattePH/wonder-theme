/*
 * password-modal.js
 * Custom element <password-modal> for the storefront password page.
 */

if (!customElements.get('password-modal')) {
  class PasswordModal extends HTMLElement {
    constructor() {
      super();
      this.openButton = document.querySelector('[data-password-modal-open]');
      this.closeButton = this.querySelector('[data-password-modal-close]');
      this.overlay = this.querySelector('.password-modal__overlay');
    }

    connectedCallback() {
      if (this.openButton) {
        this.openButton.addEventListener('click', () => this.open());
      }
      if (this.closeButton) {
        this.closeButton.addEventListener('click', () => this.close());
      }
      if (this.overlay) {
        this.overlay.addEventListener('click', () => this.close());
      }

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.hasAttribute('open')) this.close();
      });

      if (this.querySelector('.password-modal__error')) {
        this.open();
      }
    }

    open() {
      this.setAttribute('open', '');
      document.body.style.overflow = 'hidden';
      const input = this.querySelector('input[type="password"]');
      if (input) input.focus();
    }

    close() {
      this.removeAttribute('open');
      document.body.style.overflow = '';
      if (this.openButton) this.openButton.focus();
    }
  }

  customElements.define('password-modal', PasswordModal);
}
