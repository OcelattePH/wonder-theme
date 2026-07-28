/*
 * product-info.js
 * Custom element <product-info> that handles variant change detection,
 * section re-rendering, and DOM updates for price / availability / media / SKU.
 * Depends on: constants.js, pubsub.js, global.js
 */

if (!customElements.get('product-info')) {
  class ProductInfo extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.dataset.section;
      this.productUrl = this.dataset.url;
      this.onVariantChangeBound = this.onVariantChange.bind(this);
    }

    connectedCallback() {
      this.unsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChangeBound);
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    onVariantChange({ variant, sectionId }) {
      if (sectionId !== this.sectionId) return;
      if (!variant) {
        this.setUnavailable();
        return;
      }

      this.updateURL(variant);
      this.fetchAndRender(variant);
    }

    updateURL(variant) {
      if (!variant) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url.toString());
    }

    async fetchAndRender(variant) {
      const url = `${this.productUrl}?variant=${variant.id}&section_id=${this.sectionId}`;

      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Section fetch failed: ${response.status}`);
        const html = await response.text();
        this.renderSectionFromHTML(html, variant);
      } catch (error) {
        console.error('Error rendering product section:', error);
      }
    }

    renderSectionFromHTML(html, variant) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Update price
      this.updateBlock(doc, `price-${this.sectionId}`);

      // Update SKU
      this.updateBlock(doc, `Sku-${this.sectionId}`);

      // Update inventory
      this.updateBlock(doc, `Inventory-${this.sectionId}`);

      // Update buy buttons
      this.updateBlock(doc, `BuyButtons-${this.sectionId}`);

      // Update pickup availability
      this.updatePickupAvailability(variant);

      // Update active media
      this.updateMedia(variant);

      // Publish section refresh
      publish(PUB_SUB_EVENTS.sectionRefreshed, {
        source: this,
        sectionId: this.sectionId,
        variant,
      });
    }

    updateBlock(doc, id) {
      const source = doc.getElementById(id);
      const target = document.getElementById(id);
      if (source && target) {
        target.innerHTML = source.innerHTML;
      }
    }

    updatePickupAvailability(variant) {
      const pickupEl = this.querySelector('pickup-availability');
      if (!pickupEl) return;

      if (variant.available) {
        pickupEl.setAttribute('available', '');
      } else {
        pickupEl.removeAttribute('available');
      }

      // Re-fetch pickup availability for the new variant
      const rootUrl = pickupEl.dataset.rootUrl || '';
      pickupEl.dataset.variantId = variant.id;

      fetch(`${rootUrl}/variants/${variant.id}/?section_id=pickup-availability`)
        .then((res) => res.text())
        .then((html) => {
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const freshEl = doc.querySelector('pickup-availability-preview');
          const currentPreview = pickupEl.querySelector('pickup-availability-preview');
          if (freshEl && currentPreview) {
            currentPreview.innerHTML = freshEl.innerHTML;
          } else if (freshEl) {
            pickupEl.appendChild(freshEl);
          } else if (currentPreview) {
            currentPreview.remove();
          }
        })
        .catch((err) => console.error('Pickup availability fetch error:', err));
    }

    updateMedia(variant) {
      if (!variant.featured_media) return;

      const mediaId = variant.featured_media.id;
      const mediaGallery = this.querySelector('[data-media-gallery]');
      if (!mediaGallery) return;

      // Update active state on media items
      const mediaItems = mediaGallery.querySelectorAll('[data-media-id]');
      mediaItems.forEach((item) => {
        const isTarget = String(item.dataset.mediaId) === String(mediaId);
        if (item.classList.contains('product-media-gallery__media')) {
          item.classList.toggle('product-media-gallery__media--active', isTarget);
        }
        if (item.classList.contains('product-media-gallery__thumbnail')) {
          item.classList.toggle('product-media-gallery__thumbnail--active', isTarget);
          item.setAttribute('aria-current', isTarget ? 'true' : 'false');
        }
      });

      // Scroll to active media in stacked layout
      const activeMedia = mediaGallery.querySelector(
        `.product-media-gallery__media[data-media-id="${mediaId}"]`
      );
      if (activeMedia) {
        activeMedia.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    setUnavailable() {
      const addButton = this.querySelector('[name="add"]');
      if (!addButton) return;

      addButton.disabled = true;
      const btnText = addButton.querySelector('.btn__text');
      if (btnText) btnText.textContent = window.variantStrings.unavailable;

      // Hide price
      const priceEl = document.getElementById(`price-${this.sectionId}`);
      if (priceEl) priceEl.classList.add('hidden');
    }
  }

  customElements.define('product-info', ProductInfo);
}
