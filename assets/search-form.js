class SearchForm extends HTMLElement {
  constructor() {
    super();

    this.input = this.querySelector('input[type="search"]');
    this.form = this.querySelector('form');
    this.resetButton = this.querySelector('[data-search-reset]');
  }

  connectedCallback() {
    if (this.form) {
      this.form.addEventListener('submit', this.onSubmit.bind(this));
    }

    if (this.input) {
      this.input.addEventListener('input', this.onInput.bind(this));
      this.input.addEventListener('focus', this.onFocus.bind(this));
    }

    if (this.resetButton) {
      this.resetButton.addEventListener('click', this.onReset.bind(this));
    }
  }

  onSubmit(event) {
    if (!this.input.value.trim()) {
      event.preventDefault();
      this.input.focus();
      return;
    }

    const predictiveSearch = this.querySelector('predictive-search');
    if (predictiveSearch && predictiveSearch.isOpen) {
      predictiveSearch.close();
    }
  }

  onInput() {
    this.toggleResetButton();
  }

  onFocus() {
    this.input.select();
  }

  onReset(event) {
    event.preventDefault();
    this.input.value = '';
    this.input.focus();
    this.toggleResetButton();

    const predictiveSearch = this.querySelector('predictive-search');
    if (predictiveSearch) {
      predictiveSearch.close();
    }
  }

  toggleResetButton() {
    if (!this.resetButton) return;

    if (this.input.value.length > 0) {
      this.resetButton.classList.remove('hidden');
    } else {
      this.resetButton.classList.add('hidden');
    }
  }
}

customElements.define('search-form', SearchForm);
