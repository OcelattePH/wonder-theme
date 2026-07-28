/*
 * share.js -- <share-button> custom element
 * Uses Web Share API when available, falls back to clipboard copy.
 */

class ShareButton extends HTMLElement {
  constructor() {
    super();
    this.shareUrl = this.dataset.url || window.location.href;
    this.button = this.querySelector('button');
    this.panel = this.querySelector('.product__share-panel, .share-button__panel');
    this.urlInput = this.querySelector('input[type="text"]');
    this.copyButton = this.querySelector('.product__share-copy, .share-button__copy');
  }

  connectedCallback() {
    if (!this.button) return;

    if (navigator.share) {
      this.button.addEventListener('click', this.handleNativeShare.bind(this));
    } else {
      this.button.addEventListener('click', this.togglePanel.bind(this));
      if (this.copyButton) {
        this.copyButton.addEventListener('click', this.copyToClipboard.bind(this));
      }
    }
  }

  async handleNativeShare() {
    try {
      await navigator.share({
        url: this.shareUrl,
        title: document.title,
      });
    } catch (err) {
      if (err.name !== 'AbortError') {
        // User cancelled -- not an error
        this.togglePanel();
      }
    }
  }

  togglePanel() {
    if (!this.panel) return;
    this.panel.classList.toggle('hidden');
    const isOpen = !this.panel.classList.contains('hidden');
    this.button.setAttribute('aria-expanded', isOpen);
    if (isOpen && this.urlInput) {
      this.urlInput.focus();
      this.urlInput.select();
    }
  }

  async copyToClipboard() {
    if (!this.urlInput) return;
    try {
      await navigator.clipboard.writeText(this.urlInput.value);
      if (this.copyButton) {
        const original = this.copyButton.textContent;
        this.copyButton.textContent = this.copyButton.dataset.success || 'Copied!';
        setTimeout(() => {
          this.copyButton.textContent = original;
        }, 2000);
      }
    } catch {
      this.urlInput.select();
      document.execCommand('copy');
    }
  }
}

if (!customElements.get('share-button')) {
  customElements.define('share-button', ShareButton);
}
