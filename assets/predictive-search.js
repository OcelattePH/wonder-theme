class PredictiveSearch extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('input[type="search"]');
    this.results = this.querySelector('[data-predictive-search-results]');
    this.overlay = this.querySelector('[data-predictive-search-overlay]');
    this.status = this.querySelector('[data-predictive-search-status]');
    this.isOpen = false;
    this.abortController = new AbortController();
    this.cachedResults = {};
    this.selectedIndex = -1;
  }

  connectedCallback() {
    this.input.addEventListener('input', this.debounce(this.onInput.bind(this), 300));
    this.input.addEventListener('focus', this.onFocus.bind(this));
    this.input.addEventListener('keydown', this.onKeydown.bind(this));
    document.addEventListener('click', this.onClickOutside.bind(this));
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.onClickOutside.bind(this));
  }

  debounce(fn, delay) {
    let timer = null;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  onInput() {
    const query = this.input.value.trim();

    if (query.length === 0) {
      this.close();
      return;
    }

    this.getSearchResults(query);
  }

  onFocus() {
    const query = this.input.value.trim();

    if (query.length === 0) return;

    if (this.results && this.results.innerHTML.trim().length > 0) {
      this.open();
    } else {
      this.getSearchResults(query);
    }
  }

  onKeydown(event) {
    if (!this.isOpen) return;

    const items = this.getResultItems();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
        this.updateSelection(items);
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
        this.updateSelection(items);
        break;

      case 'Enter':
        if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
          event.preventDefault();
          const link = items[this.selectedIndex].querySelector('a');
          if (link) link.click();
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.close();
        this.input.blur();
        break;
    }
  }

  getResultItems() {
    if (!this.results) return [];
    return Array.from(this.results.querySelectorAll('.predictive-search__list-item'));
  }

  updateSelection(items) {
    items.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;
      item.setAttribute('aria-selected', isSelected);
      item.classList.toggle('predictive-search__list-item--selected', isSelected);

      if (isSelected) {
        const link = item.querySelector('a');
        if (link) link.setAttribute('tabindex', '0');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        const link = item.querySelector('a');
        if (link) link.setAttribute('tabindex', '-1');
      }
    });
  }

  onClickOutside(event) {
    if (!this.contains(event.target)) {
      this.close();
    }
  }

  async getSearchResults(query) {
    if (this.cachedResults[query]) {
      this.renderResults(this.cachedResults[query]);
      return;
    }

    this.abortController.abort();
    this.abortController = new AbortController();

    this.setLoading(true);

    try {
      const url = `${routes.predictive_search_url}?q=${encodeURIComponent(query)}&resources[type]=product,page,article,collection,query&resources[limit]=4&section_id=predictive-search`;

      const response = await fetch(url, {
        signal: this.abortController.signal,
      });

      if (!response.ok) throw new Error(response.status);

      const text = await response.text();
      const html = new DOMParser().parseFromString(text, 'text/html');
      const resultsMarkup = html.querySelector('#shopify-section-predictive-search').innerHTML;

      this.cachedResults[query] = resultsMarkup;
      this.renderResults(resultsMarkup);
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.close();
    } finally {
      this.setLoading(false);
    }
  }

  renderResults(markup) {
    if (this.results) {
      this.results.innerHTML = markup;
    }
    this.selectedIndex = -1;
    this.open();
  }

  setLoading(isLoading) {
    this.classList.toggle('predictive-search--loading', isLoading);
    if (this.status) {
      this.status.setAttribute('aria-hidden', !isLoading);
    }
  }

  open() {
    this.isOpen = true;
    this.setAttribute('open', '');
    this.input.setAttribute('aria-expanded', 'true');
    if (this.overlay) this.overlay.removeAttribute('hidden');
  }

  close() {
    this.isOpen = false;
    this.removeAttribute('open');
    this.input.setAttribute('aria-expanded', 'false');
    if (this.overlay) this.overlay.setAttribute('hidden', '');
    this.selectedIndex = -1;

    const items = this.getResultItems();
    items.forEach((item) => {
      item.setAttribute('aria-selected', 'false');
      item.classList.remove('predictive-search__list-item--selected');
    });
  }
}

customElements.define('predictive-search', PredictiveSearch);
