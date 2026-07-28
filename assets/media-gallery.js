/*
 * media-gallery.js
 * Custom element <media-gallery> for product image galleries.
 * Handles thumbnail clicks and variant-driven media switching.
 * Depends on: pubsub.js, constants.js
 */

if (!customElements.get('media-gallery')) {
  class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this.viewer = this.querySelector('[data-media-viewer]');
      this.thumbnails = this.querySelectorAll('[data-thumbnail]');
    }

    connectedCallback() {
      this.thumbnails.forEach((thumb) => {
        thumb.addEventListener('click', this.onThumbnailClick.bind(this));
      });

      this.unsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, this.onVariantChange.bind(this));
    }

    disconnectedCallback() {
      if (this.unsubscribe) this.unsubscribe();
    }

    onThumbnailClick(event) {
      event.preventDefault();
      const mediaId = event.currentTarget.dataset.mediaId;
      if (mediaId) this.setActiveMedia(mediaId);
    }

    onVariantChange({ variant }) {
      if (!variant || !variant.featured_media) return;
      this.setActiveMedia(String(variant.featured_media.id));
    }

    setActiveMedia(mediaId) {
      if (!this.viewer) return;

      const mediaItems = this.viewer.querySelectorAll('[data-media-id]');
      mediaItems.forEach((item) => {
        const isActive = item.dataset.mediaId === mediaId;
        item.classList.toggle('is-active', isActive);
        item.toggleAttribute('hidden', !isActive);
      });

      this.thumbnails.forEach((thumb) => {
        const isActive = thumb.dataset.mediaId === mediaId;
        thumb.classList.toggle('is-active', isActive);
        thumb.setAttribute('aria-current', isActive ? 'true' : 'false');
      });
    }
  }

  customElements.define('media-gallery', MediaGallery);
}
