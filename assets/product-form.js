/*
 * product-form.js
 * Custom element <product-form> that handles AJAX cart submission,
 * loading states, error display, and cart-update events.
 * Depends on: constants.js, pubsub.js, global.js
 */

if (!customElements.get('product-form')) {
  class ProductForm extends HTMLElement {
    constructor() {
      super();
      this.form = this.querySelector('form[data-type="add-to-cart-form"]');
      this.submitButton = this.querySelector('[type="submit"]');
      this.errorWrapper = this.querySelector('.product-form__error-message-wrapper');
      this.errorMessage = this.querySelector('.product-form__error-message');
    }

    connectedCallback() {
      if (!this.form) return;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cartDrawer = document.querySelector('cart-drawer');
      this.cartNotification = document.querySelector('cart-notification');
    }

    async onSubmitHandler(event) {
      event.preventDefault();
      if (this.submitButton.disabled) return;

      this.handleLoading(true);
      this.hideError();

      const config = fetchConfig('json');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);

      // If a cart drawer or notification exists, add sections param
      if (this.cartDrawer) {
        formData.append(
          'sections',
          this.cartDrawer.getSectionsToRender
            ? this.cartDrawer.getSectionsToRender().map((s) => s.id)
            : []
        );
        formData.append('sections_url', window.location.pathname);
      }

      config.body = formData;

      try {
        const response = await fetch(window.routes.cart_add_url, config);
        const data = await response.json();

        if (!response.ok) {
          this.handleErrorMessage(data.description || data.message);
          return;
        }

        // Publish cart-update event
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'product-form',
          productVariantId: formData.get('id'),
          cartData: data,
        });

        // Open cart drawer or notification
        if (this.cartDrawer) {
          this.cartDrawer.renderContents(data);
        } else if (this.cartNotification) {
          this.cartNotification.renderContents(data);
        } else {
          // Fallback: redirect to cart
          window.location.href = window.routes.cart_url;
        }
      } catch (error) {
        console.error('Product form submission error:', error);
        this.handleErrorMessage(window.cartStrings.error);
      } finally {
        this.handleLoading(false);
      }
    }

    handleLoading(isLoading) {
      if (!this.submitButton) return;

      if (isLoading) {
        this.submitButton.setAttribute('aria-disabled', 'true');
        this.submitButton.classList.add('loading');
      } else {
        this.submitButton.removeAttribute('aria-disabled');
        this.submitButton.classList.remove('loading');
      }
    }

    handleErrorMessage(message = false) {
      if (!this.errorWrapper || !this.errorMessage) return;

      if (message) {
        this.errorWrapper.removeAttribute('hidden');
        this.errorMessage.textContent = message;
      }
    }

    hideError() {
      if (!this.errorWrapper) return;
      this.errorWrapper.setAttribute('hidden', '');
      if (this.errorMessage) this.errorMessage.textContent = '';
    }
  }

  customElements.define('product-form', ProductForm);
}
