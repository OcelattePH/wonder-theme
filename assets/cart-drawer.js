/**
 * Wonder Theme - Cart Drawer
 *
 * Slide-in cart drawer custom element.
 * Handles open/close, focus trap, body scroll lock,
 * and AJAX cart updates via Section Rendering API.
 */

class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.overlay = this.querySelector('.cart-drawer__overlay');
    this.panel = this.querySelector('.cart-drawer__panel');
    this.closeButton = this.querySelector('.cart-drawer__close');

    this.onBodyClick = this.handleBodyClick.bind(this);
    this.onKeydown = this.handleKeydown.bind(this);

    // Bind overlay click to close
    if (this.overlay) {
      this.overlay.addEventListener('click', () => this.close());
    }

    // Listen for cart update events to re-render
    document.addEventListener('cart:update', (event) => {
      this.renderContents(event.detail.cart);
    });

    // Listen for open-drawer requests (e.g., after add-to-cart)
    document.addEventListener('cart:open-drawer', () => {
      this.fetchAndOpen();
    });
  }

  connectedCallback() {
    // Set initial ARIA state
    this.setAttribute('role', 'complementary');
  }

  open() {
    this.classList.add('is-open');
    this.panel?.focus();

    // Lock body scroll
    document.body.classList.add('overflow-hidden');

    // Add event listeners
    document.addEventListener('keydown', this.onKeydown);

    // Trap focus inside drawer
    this.trapFocus();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('cart-drawer:open'));
  }

  close() {
    this.classList.remove('is-open');

    // Unlock body scroll
    document.body.classList.remove('overflow-hidden');

    // Remove event listeners
    document.removeEventListener('keydown', this.onKeydown);

    // Release focus trap
    this.releaseFocus();

    // Dispatch event
    document.dispatchEvent(new CustomEvent('cart-drawer:close'));
  }

  handleKeydown(event) {
    if (event.key === 'Escape') {
      this.close();
      return;
    }

    // Focus trap: Tab/Shift+Tab
    if (event.key === 'Tab') {
      this.maintainFocus(event);
    }
  }

  handleBodyClick(event) {
    if (!this.panel?.contains(event.target)) {
      this.close();
    }
  }

  trapFocus() {
    this.focusableElements = this.panel?.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    );

    if (!this.focusableElements || this.focusableElements.length === 0) return;

    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
  }

  maintainFocus(event) {
    if (!this.firstFocusable || !this.lastFocusable) return;

    if (event.shiftKey) {
      if (document.activeElement === this.firstFocusable) {
        event.preventDefault();
        this.lastFocusable.focus();
      }
    } else {
      if (document.activeElement === this.lastFocusable) {
        event.preventDefault();
        this.firstFocusable.focus();
      }
    }
  }

  releaseFocus() {
    this.focusableElements = null;
    this.firstFocusable = null;
    this.lastFocusable = null;
  }

  /**
   * Fetch fresh drawer HTML via Section Rendering API, then open.
   */
  fetchAndOpen() {
    this.showLoading();

    fetch(`${window.location.origin}?sections=cart-drawer`)
      .then((response) => response.json())
      .then((sections) => {
        if (sections['cart-drawer']) {
          this.renderSection(sections['cart-drawer']);
        }
        this.hideLoading();
        this.open();
      })
      .catch((error) => {
        console.error('Cart drawer fetch error:', error);
        this.hideLoading();
        // Open anyway with existing content
        this.open();
      });
  }

  /**
   * Re-render drawer contents from a section HTML string.
   */
  renderSection(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const newItems = parsed.getElementById('CartDrawer-Items');
    const currentItems = this.querySelector('#CartDrawer-Items');
    if (newItems && currentItems) {
      currentItems.innerHTML = newItems.innerHTML;
      currentItems.className = newItems.className;
    }

    const newFooter = parsed.getElementById('CartDrawer-Footer');
    const currentFooter = this.querySelector('#CartDrawer-Footer');
    if (newFooter && currentFooter) {
      currentFooter.innerHTML = newFooter.innerHTML;
      currentFooter.className = newFooter.className;
    }

    const newEmpty = parsed.getElementById('CartDrawer-Empty');
    const currentEmpty = this.querySelector('#CartDrawer-Empty');
    if (newEmpty && currentEmpty) {
      currentEmpty.innerHTML = newEmpty.innerHTML;
      currentEmpty.className = newEmpty.className;
    }

    // Update heading count
    const newHeading = parsed.querySelector('.cart-drawer__heading');
    const currentHeading = this.querySelector('.cart-drawer__heading');
    if (newHeading && currentHeading) {
      currentHeading.innerHTML = newHeading.innerHTML;
    }

    // Update empty state class on wrapper
    const newDrawer = parsed.querySelector('cart-drawer');
    if (newDrawer) {
      this.classList.toggle('is-empty', newDrawer.classList.contains('is-empty'));
    }
  }

  /**
   * Render contents from a cart state object (after cart:update event).
   */
  renderContents(cart) {
    // If drawer is open, refetch the section for fresh HTML
    if (this.classList.contains('is-open')) {
      fetch(`${window.location.origin}?sections=cart-drawer`)
        .then((response) => response.json())
        .then((sections) => {
          if (sections['cart-drawer']) {
            this.renderSection(sections['cart-drawer']);
          }
        })
        .catch((error) => {
          console.error('Cart drawer re-render error:', error);
        });
    }
  }

  /**
   * Update quantity for a line item (used by cart-remove-button inside drawer).
   */
  updateQuantity(line, quantity) {
    this.showLoading();

    const body = JSON.stringify({
      line,
      quantity,
      sections: ['cart-drawer', 'cart-icon-bubble'],
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
        if (state.sections?.['cart-drawer']) {
          this.renderSection(state.sections['cart-drawer']);
        }

        // Update cart icon count
        const cartIconBubble = document.getElementById('cart-icon-bubble');
        if (cartIconBubble && state.sections?.['cart-icon-bubble']) {
          const parsed = new DOMParser().parseFromString(
            state.sections['cart-icon-bubble'],
            'text/html'
          );
          const newBubble = parsed.querySelector('.shopify-section');
          if (newBubble) {
            cartIconBubble.innerHTML = newBubble.innerHTML;
          }
        }

        this.hideLoading();

        // Close drawer if cart is now empty
        if (state.item_count === 0) {
          this.classList.add('is-empty');
        }

        document.dispatchEvent(
          new CustomEvent('cart:update', {
            detail: { cart: state, source: 'cart-drawer' },
            bubbles: true,
          })
        );
      })
      .catch((error) => {
        console.error('Cart drawer update error:', error);
        this.hideLoading();
      });
  }

  showLoading() {
    const loading = this.querySelector('#CartDrawer-Loading');
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  hideLoading() {
    const loading = this.querySelector('#CartDrawer-Loading');
    if (loading) {
      loading.classList.add('hidden');
    }
  }
}

customElements.define('cart-drawer', CartDrawer);
