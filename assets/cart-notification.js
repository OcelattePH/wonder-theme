/**
 * Wonder Theme - Cart Notification
 *
 * Toast notification custom element that appears after add-to-cart.
 * Auto-dismisses after 5 seconds.
 */

class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = this.querySelector('#cart-notification');
    this.closeButton = this.querySelector('.cart-notification__close');
    this.continueButton = this.querySelector('.cart-notification__continue');
    this.autoDismissTimer = null;
    this.autoDismissDelay = 5000;

    if (this.closeButton) {
      this.closeButton.addEventListener('click', () => this.close());
    }

    if (this.continueButton) {
      this.continueButton.addEventListener('click', () => this.close());
    }

    // Listen for add-to-cart events
    document.addEventListener('cart:item-added', (event) => {
      this.renderContents(event.detail);
    });
  }

  /**
   * Show the notification with product details after add-to-cart.
   */
  renderContents(detail) {
    const { item, sections } = detail;

    // Update product image
    const imageContainer = this.querySelector('#cart-notification-image');
    if (imageContainer && item?.featured_image?.url) {
      imageContainer.innerHTML = `
        <img
          src="${item.featured_image.url}"
          alt="${item.featured_image.alt || item.product_title}"
          class="cart-notification__image"
          width="60"
          height="60"
          loading="lazy"
        >
      `;
    } else if (imageContainer) {
      imageContainer.innerHTML = '';
    }

    // Update product title
    const heading = this.querySelector('#cart-notification-heading');
    if (heading && item) {
      heading.textContent = item.product_title;
      if (item.variant_title) {
        heading.textContent += ` - ${item.variant_title}`;
      }
    }

    // Update cart count badge
    const countBadge = this.querySelector('.cart-notification__count');
    if (countBadge && detail.cart) {
      countBadge.textContent = `(${detail.cart.item_count})`;
    }

    // Update cart icon bubble if section is included
    if (sections?.['cart-icon-bubble']) {
      const cartIconBubble = document.getElementById('cart-icon-bubble');
      if (cartIconBubble) {
        const parsed = new DOMParser().parseFromString(
          sections['cart-icon-bubble'],
          'text/html'
        );
        const newBubble = parsed.querySelector('.shopify-section');
        if (newBubble) {
          cartIconBubble.innerHTML = newBubble.innerHTML;
        }
      }
    }

    this.show();
  }

  /**
   * Show the notification.
   */
  show() {
    if (!this.notification) return;

    // Clear any existing timer
    this.clearAutoDismiss();

    // Show the notification
    this.notification.removeAttribute('hidden');
    this.classList.add('is-visible');

    // Force reflow for animation
    this.notification.offsetHeight;
    this.classList.add('is-active');

    // Set auto-dismiss timer
    this.autoDismissTimer = setTimeout(() => {
      this.close();
    }, this.autoDismissDelay);

    // Pause auto-dismiss on hover
    this.addEventListener('mouseenter', this.pauseAutoDismiss);
    this.addEventListener('mouseleave', this.resumeAutoDismiss);
  }

  /**
   * Close/hide the notification.
   */
  close() {
    if (!this.notification) return;

    this.clearAutoDismiss();

    this.classList.remove('is-active');

    // Wait for fade-out animation to complete
    const handleTransitionEnd = () => {
      this.classList.remove('is-visible');
      this.notification.setAttribute('hidden', '');
      this.removeEventListener('transitionend', handleTransitionEnd);
    };

    this.addEventListener('transitionend', handleTransitionEnd);

    // Fallback in case transitionend doesn't fire
    setTimeout(() => {
      this.classList.remove('is-visible');
      this.notification.setAttribute('hidden', '');
    }, 300);

    this.removeEventListener('mouseenter', this.pauseAutoDismiss);
    this.removeEventListener('mouseleave', this.resumeAutoDismiss);
  }

  pauseAutoDismiss = () => {
    this.clearAutoDismiss();
  };

  resumeAutoDismiss = () => {
    this.autoDismissTimer = setTimeout(() => {
      this.close();
    }, this.autoDismissDelay);
  };

  clearAutoDismiss() {
    if (this.autoDismissTimer) {
      clearTimeout(this.autoDismissTimer);
      this.autoDismissTimer = null;
    }
  }
}

customElements.define('cart-notification', CartNotification);
