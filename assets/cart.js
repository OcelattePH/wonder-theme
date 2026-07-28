/**
 * Wonder Theme - Cart Items & Remove Button
 *
 * Custom elements for cart page quantity changes and item removal.
 * Uses Section Rendering API for partial page updates.
 */

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status');
    this.cartLiveRegion = document.getElementById('cart-live-region-text');

    this.currentItemCount = Array.from(
      this.querySelectorAll('[name="updates[]"]')
    ).reduce((total, input) => total + parseInt(input.value), 0);

    this.debouncedOnChange = this.debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    if (event.target.name !== 'updates[]') return;

    const index = event.target.dataset.index;
    const quantity = event.target.value;

    this.updateQuantity(index, quantity, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'main-cart-footer',
        section: document.getElementById('main-cart-footer')?.dataset.id,
        selector: '.js-contents',
      },
    ].filter((s) => document.getElementById(s.id));
  }

  updateQuantity(line, quantity, activeElementName) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((s) => s.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body,
    })
      .then((response) => response.json())
      .then((state) => {
        if (state.errors) {
          this.handleErrors(state, line);
          return;
        }

        this.classList.toggle('is-empty', state.item_count === 0);
        const cartFooter = document.getElementById('main-cart-footer');
        if (cartFooter) {
          cartFooter.classList.toggle('is-empty', state.item_count === 0);
        }

        this.getSectionsToRender().forEach((section) => {
          const elementToReplace = document
            .getElementById(section.id)
            ?.querySelector(section.selector) ||
            document.getElementById(section.id);

          if (elementToReplace && state.sections[section.section]) {
            const parsed = new DOMParser().parseFromString(
              state.sections[section.section],
              'text/html'
            );
            const newContent =
              parsed.querySelector(section.selector) ||
              parsed.querySelector('.shopify-section');

            if (newContent) {
              elementToReplace.innerHTML = newContent.innerHTML;
            }
          }
        });

        this.updateLiveRegions(line, state.item_count);

        const lineItem = document.getElementById(`CartItem-${line}`);
        if (lineItem?.querySelector(`[name="${activeElementName}"]`)) {
          lineItem.querySelector(`[name="${activeElementName}"]`).focus();
        }

        this.disableLoading();
        this.publishCartUpdate(state);
      })
      .catch((error) => {
        console.error('Cart update error:', error);
        this.disableLoading();
        this.handleGenericError();
      });
  }

  handleErrors(state, line) {
    const errors = state.errors;
    this.disableLoading();

    // Reset the input to max available quantity
    const lineItemInput = document.querySelector(
      `#CartItem-${line} [name="updates[]"]`
    );
    if (lineItemInput) {
      lineItemInput.value = lineItemInput.getAttribute('value');
      lineItemInput.focus();
    }

    if (this.cartLiveRegion) {
      this.cartLiveRegion.textContent = typeof errors === 'string'
        ? errors
        : Object.values(errors).join(', ');
    }
  }

  handleGenericError() {
    if (this.cartLiveRegion) {
      this.cartLiveRegion.textContent =
        window.cartStrings?.error || 'Something went wrong. Please try again.';
    }
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      const lineItemElement = document.getElementById(`CartItem-${line}`);
      if (lineItemElement && this.lineItemStatusElement) {
        const quantityEl = lineItemElement.querySelector('[name="updates[]"]');
        if (quantityEl) {
          this.lineItemStatusElement.textContent =
            window.cartStrings?.quantityUpdated?.replace(
              '[quantity]',
              quantityEl.value
            ) || `Quantity updated to ${quantityEl.value}`;
        }
      }
    } else {
      if (this.cartLiveRegion) {
        this.cartLiveRegion.textContent =
          window.cartStrings?.itemRemoved || 'Item removed from cart';
      }
    }

    this.currentItemCount = itemCount;
  }

  enableLoading(line) {
    const loadingOverlay = this.querySelector('.cart__loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.remove('hidden');
    }

    document.activeElement.blur();

    const lineItem = document.getElementById(`CartItem-${line}`);
    if (lineItem) {
      lineItem.classList.add('cart-item--loading');
    }
  }

  disableLoading() {
    const loadingOverlay = this.querySelector('.cart__loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }

    document.querySelectorAll('.cart-item--loading').forEach((item) => {
      item.classList.remove('cart-item--loading');
    });
  }

  publishCartUpdate(state) {
    document.dispatchEvent(
      new CustomEvent('cart:update', {
        detail: { cart: state },
        bubbles: true,
      })
    );
  }

  debounce(fn, wait) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }
}

customElements.define('cart-items', CartItems);


class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer');
      if (cartItems && typeof cartItems.updateQuantity === 'function') {
        cartItems.updateQuantity(this.dataset.index, 0);
      }
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);


class QuantityInput extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('.quantity__input');
    this.changeEvent = new Event('change', { bubbles: true });

    this.querySelectorAll('.quantity__button').forEach((button) => {
      button.addEventListener('click', this.onButtonClick.bind(this));
    });
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;
    const button = event.currentTarget;

    if (button.name === 'plus') {
      this.input.stepUp();
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) {
      this.input.dispatchEvent(this.changeEvent);
    }
  }
}

customElements.define('quantity-input', QuantityInput);
