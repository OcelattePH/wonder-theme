if (!customElements.get('facet-filters-form')) {
  class FacetFiltersForm extends HTMLElement {
    constructor() {
      super();
      this.sectionId = this.getSectionId();
      this.form = null;
      this.drawer = null;
      this.drawerOverlay = null;
      this.openBtn = null;
      this.closeBtn = null;
      this.applyBtn = null;
      this.loadingOverlay = null;
      this.debouncedOnInput = debounce((event) => {
        this.onInputChange(event);
      }, 500);
      this.debouncedOnPriceInput = debounce((event) => {
        this.onInputChange(event);
      }, 800);
    }

    connectedCallback() {
      this.form = this.querySelector('.facets__form');
      this.drawer = this.querySelector('.facets__drawer');
      this.drawerOverlay = this.querySelector('.facets__drawer-overlay');
      this.openBtn = this.querySelector('.facets__open-btn');
      this.closeBtn = this.querySelector('.facets__close-btn');
      this.applyBtn = this.querySelector('.facets__apply-btn');
      this.loadingOverlay = document.querySelector('.loading-overlay');

      if (this.form) {
        this.form.addEventListener('input', (event) => {
          if (event.target.matches('input[type="checkbox"]')) {
            this.debouncedOnInput(event);
          }
        });

        this.form.addEventListener('change', (event) => {
          if (event.target.matches('.facets__sort-select')) {
            this.onInputChange(event);
          }
        });

        this.form.addEventListener('input', (event) => {
          if (event.target.closest('price-range')) {
            this.debouncedOnPriceInput(event);
          }
        });
      }

      if (this.openBtn) {
        this.openBtn.addEventListener('click', () => this.openDrawer());
      }

      if (this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.closeDrawer());
      }

      if (this.drawerOverlay) {
        this.drawerOverlay.addEventListener('click', () => this.closeDrawer());
      }

      if (this.applyBtn) {
        this.applyBtn.addEventListener('click', () => {
          const searchParams = this.createSearchParams();
          this.renderPage(searchParams);
          this.closeDrawer();
        });
      }

      this.addEventListener('click', (event) => {
        const removeLink = event.target.closest('facet-remove a');
        if (removeLink) {
          event.preventDefault();
          this.onActiveFilterClick(removeLink);
        }
      });

      window.addEventListener('popstate', this.onHistoryChange.bind(this));
    }

    getSectionId() {
      return this.dataset.sectionId;
    }

    onInputChange(event) {
      const searchParams = this.createSearchParams();
      this.renderPage(searchParams);
    }

    onActiveFilterClick(link) {
      const url = new URL(link.href);
      this.renderPage(url.searchParams.toString());
    }

    onHistoryChange() {
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.delete('section_id');
      this.renderPage(searchParams.toString(), false);
    }

    createSearchParams() {
      const params = new URLSearchParams();

      const checkboxes = this.querySelectorAll('input[type="checkbox"]:checked');
      checkboxes.forEach((checkbox) => {
        params.append(checkbox.name, checkbox.value);
      });

      const sortSelect = this.querySelector('.facets__sort-select');
      if (sortSelect && sortSelect.value) {
        params.set('sort_by', sortSelect.value);
      }

      const priceRanges = this.querySelectorAll('price-range');
      priceRanges.forEach((priceRange) => {
        const minInput = priceRange.querySelector('input[name*="gte"]') || priceRange.querySelector('input:first-of-type');
        const maxInput = priceRange.querySelector('input[name*="lte"]') || priceRange.querySelector('input:last-of-type');

        if (minInput && minInput.value !== '' && minInput.value !== '0') {
          params.set(minInput.name, minInput.value);
        }
        if (maxInput && maxInput.value !== '' && maxInput.value !== maxInput.placeholder) {
          params.set(maxInput.name, maxInput.value);
        }
      });

      return params.toString();
    }

    async renderPage(searchParams, updateURLHash = true) {
      this.showLoading();

      const sectionId = this.sectionId;
      const url = `${window.location.pathname}?section_id=${sectionId}&${searchParams}`;

      try {
        const response = await fetch(url, fetchConfig('javascript'));
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');

        const productGrid = document.getElementById(`ProductGrid-${sectionId}`);
        const newProductGrid = doc.getElementById(`ProductGrid-${sectionId}`);
        if (productGrid && newProductGrid) {
          productGrid.innerHTML = newProductGrid.innerHTML;
        }

        const productCount = document.getElementById(`ProductCount-${sectionId}`);
        const newProductCount = doc.getElementById(`ProductCount-${sectionId}`);
        if (productCount && newProductCount) {
          productCount.innerHTML = newProductCount.innerHTML;
        }

        const activeFacets = document.getElementById('ActiveFacets');
        const newActiveFacets = doc.getElementById('ActiveFacets');
        if (activeFacets && newActiveFacets) {
          activeFacets.outerHTML = newActiveFacets.outerHTML;
        } else if (activeFacets && !newActiveFacets) {
          activeFacets.outerHTML = '<div class="active-facets" id="ActiveFacets"></div>';
        } else if (!activeFacets && newActiveFacets) {
          const header = this.querySelector('.facets__header');
          if (header) {
            header.insertAdjacentHTML('afterend', newActiveFacets.outerHTML);
          }
        }

        this.updateFilterFormValues(doc);

        const countBadge = this.querySelector('.facets__count-badge');
        const newBadge = doc.querySelector('.facets__count-badge');
        if (countBadge && newBadge) {
          countBadge.textContent = newBadge.textContent;
        } else if (countBadge && !newBadge) {
          countBadge.remove();
        } else if (!countBadge && newBadge) {
          const openBtn = this.querySelector('.facets__open-btn');
          if (openBtn) {
            openBtn.insertAdjacentHTML('beforeend', newBadge.outerHTML);
          }
        }

        if (updateURLHash) {
          history.pushState({}, '', `${window.location.pathname}?${searchParams}`);
        }

        publish(PUB_SUB_EVENTS.sectionRefreshed, {
          sectionId: sectionId,
          resource: { url: window.location.href },
        });
      } catch (error) {
        console.error('Error rendering faceted page:', error);
      } finally {
        this.hideLoading();
      }
    }

    updateFilterFormValues(doc) {
      const newCheckboxes = doc.querySelectorAll('.facets__drawer input[type="checkbox"]');
      newCheckboxes.forEach((newCheckbox) => {
        const currentCheckbox = this.querySelector(`#${CSS.escape(newCheckbox.id)}`);
        if (currentCheckbox) {
          currentCheckbox.checked = newCheckbox.checked;
          currentCheckbox.disabled = newCheckbox.disabled;
        }
      });

      const newPriceInputs = doc.querySelectorAll('.facets__drawer price-range input[type="number"]');
      newPriceInputs.forEach((newInput) => {
        const currentInput = this.querySelector(`#${CSS.escape(newInput.id)}`);
        if (currentInput) {
          currentInput.value = newInput.value;
        }
      });
    }

    openDrawer() {
      if (!this.drawer) return;
      this.drawer.classList.add('is-open');
      if (this.drawerOverlay) {
        this.drawerOverlay.classList.add('is-visible');
      }
      document.body.style.overflow = 'hidden';
      if (this.openBtn) {
        this.openBtn.setAttribute('aria-expanded', 'true');
      }
      if (this.closeBtn) {
        this.closeBtn.focus();
      }
    }

    closeDrawer() {
      if (!this.drawer) return;
      this.drawer.classList.remove('is-open');
      if (this.drawerOverlay) {
        this.drawerOverlay.classList.remove('is-visible');
      }
      document.body.style.overflow = '';
      if (this.openBtn) {
        this.openBtn.setAttribute('aria-expanded', 'false');
        this.openBtn.focus();
      }
    }

    showLoading() {
      if (this.loadingOverlay) {
        this.loadingOverlay.classList.add('is-visible');
      }
    }

    hideLoading() {
      if (this.loadingOverlay) {
        this.loadingOverlay.classList.remove('is-visible');
      }
    }
  }

  customElements.define('facet-filters-form', FacetFiltersForm);
}

if (!customElements.get('price-range')) {
  class PriceRange extends HTMLElement {
    constructor() {
      super();
      this.minInput = null;
      this.maxInput = null;
    }

    connectedCallback() {
      this.minInput = this.querySelector('input:first-of-type');
      this.maxInput = this.querySelector('input:last-of-type');

      if (this.minInput) {
        this.minInput.addEventListener(
          'input',
          debounce(() => this.onMinChange(), 800)
        );
      }

      if (this.maxInput) {
        this.maxInput.addEventListener(
          'input',
          debounce(() => this.onMaxChange(), 800)
        );
      }
    }

    onMinChange() {
      const minVal = parseFloat(this.minInput.value);
      const maxVal = parseFloat(this.maxInput.value);

      if (this.minInput.value !== '' && this.maxInput.value !== '') {
        if (minVal > maxVal) {
          this.minInput.value = this.maxInput.value;
        }
      }

      this.dispatchChange();
    }

    onMaxChange() {
      const minVal = parseFloat(this.minInput.value);
      const maxVal = parseFloat(this.maxInput.value);

      if (this.minInput.value !== '' && this.maxInput.value !== '') {
        if (maxVal < minVal) {
          this.maxInput.value = this.minInput.value;
        }
      }

      this.dispatchChange();
    }

    dispatchChange() {
      this.dispatchEvent(
        new Event('input', { bubbles: true })
      );
    }
  }

  customElements.define('price-range', PriceRange);
}

if (!customElements.get('facet-remove')) {
  class FacetRemove extends HTMLElement {
    constructor() {
      super();
    }

    connectedCallback() {
      const link = this.querySelector('a');
      if (!link) return;

      link.addEventListener('click', (event) => {
        event.preventDefault();
        const facetForm = this.closest('facet-filters-form');
        if (facetForm) {
          const url = new URL(link.href);
          facetForm.renderPage(url.searchParams.toString());
        }
      });
    }
  }

  customElements.define('facet-remove', FacetRemove);
}
