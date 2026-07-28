/*
 * global.js -- Shopify Online Store 2.0 theme
 * Loaded on every page with defer.
 * Depends on: constants.js, pubsub.js
 */

/* ============================================================================
   Utilities
   ========================================================================= */

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last < delay) return;
    last = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': `application/${type}`,
    },
  };
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled"
    )
  );
}

let trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  const focusable = getFocusableElements(container);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (e) => {
    if (e.target !== container && e.target !== last && e.target !== first) return;
    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = () => {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = (e) => {
    if (e.code !== 'Tab') return;

    if (e.target === last && !e.shiftKey) {
      e.preventDefault();
      first.focus();
    }

    if ((e.target === container || e.target === first) && e.shiftKey) {
      e.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  if (elementToFocus) elementToFocus.focus();
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('model-viewer').forEach((model) => model.pause());
}

/* ============================================================================
   Custom Elements
   ========================================================================= */

/* ---------- QuantityInput ---------- */

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.btnMinus = this.querySelector('button[name="minus"]');
    this.btnPlus = this.querySelector('button[name="plus"]');
    this.changeEvent = new Event('change', { bubbles: true });
  }

  connectedCallback() {
    this.btnMinus.addEventListener('click', this.onButtonClick.bind(this));
    this.btnPlus.addEventListener('click', this.onButtonClick.bind(this));
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.validateQtyRules();
  }

  disconnectedCallback() {
    this.btnMinus.removeEventListener('click', this.onButtonClick);
    this.btnPlus.removeEventListener('click', this.onButtonClick);
    this.input.removeEventListener('change', this.onInputChange);
  }

  onButtonClick(event) {
    event.preventDefault();
    const prevValue = Number(this.input.value);
    const button = event.currentTarget;

    if (button.name === 'plus') {
      this.input.stepUp();
    } else {
      this.input.stepDown();
    }

    if (prevValue !== Number(this.input.value)) {
      this.input.dispatchEvent(this.changeEvent);
    }
  }

  onInputChange() {
    this.validateQtyRules();
    publish(PUB_SUB_EVENTS.quantityUpdate, {
      source: this,
      quantity: Number(this.input.value),
    });
  }

  validateQtyRules() {
    const value = Number(this.input.value);
    const min = Number(this.input.min) || 1;
    const max = Number(this.input.max);

    if (this.btnMinus) this.btnMinus.disabled = value <= min;
    if (this.btnPlus && max) this.btnPlus.disabled = value >= max;
  }
}

/* ---------- MenuDrawer ---------- */

class MenuDrawer extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.onBodyClickBound = this.onBodyClick.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
  }

  connectedCallback() {
    if (!this.mainDetailsToggle) return;

    this.addEventListener('keyup', this.onKeyUpBound);

    const summaryEl = this.mainDetailsToggle.querySelector('summary');
    if (summaryEl) {
      summaryEl.setAttribute('role', 'button');
      summaryEl.addEventListener('click', this.onSummaryClick.bind(this));
    }

    const overlay = this.querySelector('.drawer__overlay');
    if (overlay) overlay.addEventListener('click', this.close.bind(this, null));

    this.querySelectorAll('details').forEach((details) => {
      const summary = details.querySelector('summary');
      if (summary && details !== this.mainDetailsToggle) {
        summary.addEventListener('click', this.onSubmenuToggle.bind(this));
      }
    });
  }

  onSubmenuToggle(event) {
    const details = event.currentTarget.closest('details');
    const isOpen = details.hasAttribute('open');

    // Close sibling submenus
    const parent = details.parentElement;
    if (parent) {
      parent.querySelectorAll(':scope > details[open]').forEach((sibling) => {
        if (sibling !== details) sibling.removeAttribute('open');
      });
    }

    if (!isOpen) {
      const firstLink = details.querySelector('a');
      if (firstLink) setTimeout(() => firstLink.focus(), 100);
    }
  }

  onSummaryClick(event) {
    const isOpen = this.mainDetailsToggle.hasAttribute('open');

    if (isOpen) {
      this.close(event);
    } else {
      this.open(event);
    }
  }

  onKeyUp(event) {
    if (event.code === 'Escape') this.close(event);
  }

  open(event) {
    if (event) event.preventDefault();
    this.mainDetailsToggle.setAttribute('open', '');

    const overlay = this.querySelector('.drawer__overlay');
    if (overlay) overlay.classList.add('is-visible');

    this.classList.add('is-open');
    document.body.classList.add('overflow-hidden');
    document.addEventListener('click', this.onBodyClickBound);

    trapFocus(this.mainDetailsToggle);
  }

  close(event, elementToFocus = null) {
    if (event) event.preventDefault();
    if (!this.mainDetailsToggle.hasAttribute('open')) return;

    this.classList.remove('is-open');
    this.mainDetailsToggle.removeAttribute('open');

    const overlay = this.querySelector('.drawer__overlay');
    if (overlay) overlay.classList.remove('is-visible');

    document.body.classList.remove('overflow-hidden');
    document.removeEventListener('click', this.onBodyClickBound);

    removeTrapFocus(elementToFocus || this.mainDetailsToggle.querySelector('summary'));

    // Close all nested submenus
    this.querySelectorAll('details[open]').forEach((details) => {
      if (details !== this.mainDetailsToggle) details.removeAttribute('open');
    });
  }

  onBodyClick(event) {
    if (!this.contains(event.target)) this.close(event);
  }
}

/* ---------- HeaderDrawer ---------- */

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
    this.header = this.header || this.closest('.section-header') || document.querySelector('.section-header');
  }

  open(event) {
    super.open(event);
    if (this.header) this.header.classList.add('menu-open');
  }

  close(event, elementToFocus = null) {
    super.close(event, elementToFocus);
    if (this.header) this.header.classList.remove('menu-open');
  }
}

/* ---------- ModalDialog ---------- */

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onClickBound = this.onClick.bind(this);
  }

  connectedCallback() {
    this.addEventListener('keyup', this.onKeyUpBound);
    this.addEventListener('click', this.onClickBound);
    const closeButtons = this.querySelectorAll('[data-modal-close]');
    closeButtons.forEach((btn) => btn.addEventListener('click', () => this.hide()));
  }

  disconnectedCallback() {
    this.removeEventListener('keyup', this.onKeyUpBound);
    this.removeEventListener('click', this.onClickBound);
  }

  show(opener = null) {
    this.openedBy = opener;
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    this.classList.add('is-open');
    pauseAllMedia();
    trapFocus(this, this.querySelector('[role="dialog"]') || this);
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    this.removeAttribute('open');
    this.classList.remove('is-open');
    removeTrapFocus(this.openedBy);
    pauseAllMedia();
  }

  onKeyUp(event) {
    if (event.code === 'Escape') this.hide();
  }

  onClick(event) {
    if (event.target === this) this.hide();
  }
}

/* ---------- ModalOpener ---------- */

class ModalOpener extends HTMLElement {
  connectedCallback() {
    const button = this.querySelector('button') || this.querySelector('[role="button"]');
    if (!button) return;

    button.addEventListener('click', () => {
      const modalId = this.dataset.modal || button.dataset.modal;
      const modal = document.querySelector(`#${modalId}`);
      if (modal && typeof modal.show === 'function') modal.show(button);
    });
  }
}

/* ---------- SliderComponent ---------- */

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]') || this.querySelector('.slider');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');
    this.pageCount = this.querySelector('.slider-counter--current');
    this.pageTotal = this.querySelector('.slider-counter--total');
    this.currentPage = 1;
  }

  connectedCallback() {
    if (!this.slider) return;

    this.slides = this.slider.querySelectorAll('.slider__slide');
    if (this.slides.length < 2) return;

    this.initSlider();
    this.initObserver();
  }

  disconnectedCallback() {
    if (this.observer) this.observer.disconnect();
    if (this.autoplayInterval) clearInterval(this.autoplayInterval);
  }

  initSlider() {
    if (this.prevButton) {
      this.prevButton.addEventListener('click', this.onPrevClick.bind(this));
    }
    if (this.nextButton) {
      this.nextButton.addEventListener('click', this.onNextClick.bind(this));
    }

    this.slider.addEventListener('scroll', debounce(this.updateButtons.bind(this), 100));

    const autoplaySpeed = Number(this.dataset.autoplaySpeed);
    if (autoplaySpeed > 0) {
      this.startAutoplay(autoplaySpeed);
      this.addEventListener('mouseenter', () => this.pauseAutoplay());
      this.addEventListener('mouseleave', () => this.startAutoplay(autoplaySpeed));
    }
  }

  initObserver() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(this.slides).indexOf(entry.target);
            this.currentPage = index + 1;
            this.updateCounter();
            this.dispatchEvent(
              new CustomEvent('slideChanged', {
                detail: { currentPage: this.currentPage, currentSlide: entry.target },
                bubbles: true,
              })
            );
          }
        });
      },
      { root: this.slider, threshold: 0.5 }
    );

    this.slides.forEach((slide) => this.observer.observe(slide));
  }

  updateButtons() {
    if (!this.slider) return;
    const { scrollLeft, scrollWidth, clientWidth } = this.slider;
    const atStart = scrollLeft <= 2;
    const atEnd = scrollLeft + clientWidth >= scrollWidth - 2;

    if (this.prevButton) this.prevButton.disabled = atStart;
    if (this.nextButton) this.nextButton.disabled = atEnd;
  }

  updateCounter() {
    if (this.pageCount) this.pageCount.textContent = this.currentPage;
    if (this.pageTotal) this.pageTotal.textContent = this.slides.length;
  }

  onPrevClick() {
    const slideWidth = this.slides[0].clientWidth;
    this.slider.scrollBy({ left: -slideWidth, behavior: 'smooth' });
  }

  onNextClick() {
    const slideWidth = this.slides[0].clientWidth;
    this.slider.scrollBy({ left: slideWidth, behavior: 'smooth' });
  }

  startAutoplay(speed) {
    this.pauseAutoplay();
    this.autoplayInterval = setInterval(() => this.autoAdvance(), speed * 1000);
  }

  pauseAutoplay() {
    if (this.autoplayInterval) {
      clearInterval(this.autoplayInterval);
      this.autoplayInterval = null;
    }
  }

  autoAdvance() {
    const { scrollLeft, scrollWidth, clientWidth } = this.slider;
    if (scrollLeft + clientWidth >= scrollWidth - 2) {
      this.slider.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      this.onNextClick();
    }
  }
}

/* ---------- SlideshowComponent ---------- */

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.playButton = this.querySelector('[name="play-pause"]');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.playing = !this.reduceMotion.matches;
  }

  connectedCallback() {
    super.connectedCallback();

    if (this.playButton) {
      this.playButton.addEventListener('click', this.toggleAutoplay.bind(this));
    }

    this.reduceMotion.addEventListener('change', () => {
      if (this.reduceMotion.matches) {
        this.pause();
      } else {
        this.play();
      }
    });

    if (this.reduceMotion.matches) {
      this.pause();
    } else {
      const speed = Number(this.dataset.autoplaySpeed) || 5;
      this.startAutoplay(speed);
    }
  }

  toggleAutoplay() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    this.playing = true;
    if (this.playButton) this.playButton.classList.remove('slideshow__autoplay--paused');
    const speed = Number(this.dataset.autoplaySpeed) || 5;
    this.startAutoplay(speed);
  }

  pause() {
    this.playing = false;
    if (this.playButton) this.playButton.classList.add('slideshow__autoplay--paused');
    this.pauseAutoplay();
  }
}

/* ---------- DeferredMedia ---------- */

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    this.poster = this.querySelector('[id^="Deferred-Poster-"]') || this.querySelector('.deferred-media__poster');
    this.autoplay = this.dataset.autoplay === 'true';
  }

  connectedCallback() {
    if (this.poster) {
      this.poster.addEventListener('click', this.loadContent.bind(this));
    }
    if (this.autoplay) this.loadContent();
  }

  loadContent() {
    if (this.getAttribute('loaded')) return;

    const template = this.querySelector('template');
    if (!template) return;

    const content = template.content.firstElementChild.cloneNode(true);
    this.setAttribute('loaded', '');
    this.appendChild(content);

    if (this.poster) this.poster.classList.add('hidden');

    const focusTarget = content.querySelector('iframe, video, model-viewer');
    if (focusTarget) focusTarget.focus();

    this.dispatchEvent(new CustomEvent('mediaLoaded', { bubbles: true }));
  }
}

/* ---------- VariantSelects ---------- */

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.onChangeBound = debounce(this.onVariantChange.bind(this), ON_CHANGE_DEBOUNCE_TIMER);
  }

  connectedCallback() {
    this.addEventListener('change', this.onChangeBound);
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.onChangeBound);
  }

  onVariantChange() {
    this.updateOptions();
    this.updateMasterId();

    if (!this.currentVariant) {
      this.toggleAddButton(true, '', true);
      return;
    }

    this.updateURL();
    this.updateVariantInput();
    this.renderProductInfo();

    publish(PUB_SUB_EVENTS.variantChange, {
      source: this,
      variant: this.currentVariant,
      sectionId: this.dataset.section,
    });
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('select'), (el) => el.value);
  }

  updateMasterId() {
    const variants = this.getVariantData();
    this.currentVariant = variants.find((variant) =>
      variant.options.every((value, index) => this.options[index] === value)
    );
  }

  updateURL() {
    if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
    window.history.replaceState({}, '', `${this.dataset.url}?variant=${this.currentVariant.id}`);
  }

  updateVariantInput() {
    const inputs = document.querySelectorAll(
      `#product-form-${this.dataset.section} input[name="id"], #product-form-installment-${this.dataset.section} input[name="id"]`
    );
    inputs.forEach((input) => (input.value = this.currentVariant.id));
  }

  renderProductInfo() {
    const sectionId = this.dataset.section;
    const url = `${this.dataset.url}?variant=${this.currentVariant.id}&section_id=${sectionId}`;

    fetch(url)
      .then((response) => response.text())
      .then((html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const source = doc.getElementById(`price-${sectionId}`);
        const target = document.getElementById(`price-${sectionId}`);
        if (source && target) target.innerHTML = source.innerHTML;

        this.toggleAddButton(
          !this.currentVariant.available,
          this.currentVariant.available ? '' : window.variantStrings.soldOut
        );

        publish(PUB_SUB_EVENTS.sectionRefreshed, { source: this, sectionId });
      })
      .catch((e) => {
        console.error('Error fetching section:', e);
      });
  }

  toggleAddButton(disable = true, text = '', modifyClass = false) {
    const addButton = document.getElementById(`product-form-${this.dataset.section}`)?.querySelector('[name="add"]');
    if (!addButton) return;

    addButton.disabled = disable;

    const textEl = addButton.querySelector('.btn__text') || addButton;
    if (text) {
      textEl.textContent = text;
    } else if (!disable) {
      textEl.textContent = window.variantStrings.addToCart;
    }

    if (modifyClass) {
      addButton.classList.toggle('sold-out', disable);
    }
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}

/* ---------- VariantRadios ---------- */

class VariantRadios extends VariantSelects {
  updateOptions() {
    const fieldsets = Array.from(this.querySelectorAll('fieldset'));
    this.options = fieldsets.map((fieldset) => {
      return Array.from(fieldset.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });
  }
}

/* ---------- LocalizationForm ---------- */

class LocalizationForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.inputs = this.querySelectorAll('input[name="country_code"], input[name="locale_code"]');

    this.querySelectorAll('a[data-value]').forEach((link) => {
      link.addEventListener('click', this.onItemClick.bind(this));
    });
  }

  onItemClick(event) {
    event.preventDefault();
    const link = event.currentTarget;
    const input = this.form.querySelector(`input[name="${link.dataset.name || 'locale_code'}"]`);
    if (input) input.value = link.dataset.value;
    this.form.submit();
  }
}

/* ---------- ShowMoreButton ---------- */

class ShowMoreButton extends HTMLElement {
  connectedCallback() {
    const button = this.querySelector('button');
    if (!button) return;

    button.addEventListener('click', () => {
      const targetId = this.dataset.target;
      const target = targetId ? document.getElementById(targetId) : this.previousElementSibling;
      if (!target) return;

      target.classList.toggle('hidden-content--expanded');
      const expanded = target.classList.contains('hidden-content--expanded');

      button.textContent = expanded
        ? this.dataset.showLess || 'Show less'
        : this.dataset.showMore || 'Show more';

      if (!expanded) target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

/* ---------- DetailsDisclosure ---------- */

class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.details = this.querySelector('details');
    this.summary = this.querySelector('summary');
    this.content = this.querySelector('.disclosure__content') || this.details?.querySelector(':scope > :not(summary)');
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
  }

  connectedCallback() {
    if (!this.details || !this.summary) return;
    this.summary.addEventListener('click', this.onClick.bind(this));
  }

  onClick(event) {
    event.preventDefault();
    this.details.style.overflow = 'hidden';

    if (this.isClosing || !this.details.open) {
      this.open();
    } else if (this.isExpanding || this.details.open) {
      this.close();
    }
  }

  open() {
    this.details.style.height = `${this.details.offsetHeight}px`;
    this.details.open = true;

    if (this.dataset.accordion) this.closeAccordionSiblings();

    window.requestAnimationFrame(() => this.expand());
  }

  expand() {
    this.isExpanding = true;
    const startHeight = `${this.details.offsetHeight}px`;
    const endHeight = `${this.summary.offsetHeight + this.content.offsetHeight}px`;

    if (this.animation) this.animation.cancel();

    this.animation = this.details.animate(
      { height: [startHeight, endHeight] },
      { duration: 300, easing: 'ease-out' }
    );

    this.animation.onfinish = () => this.onAnimationFinish(true);
    this.animation.oncancel = () => (this.isExpanding = false);
  }

  close() {
    this.isClosing = true;
    const startHeight = `${this.details.offsetHeight}px`;
    const endHeight = `${this.summary.offsetHeight}px`;

    if (this.animation) this.animation.cancel();

    this.animation = this.details.animate(
      { height: [startHeight, endHeight] },
      { duration: 300, easing: 'ease-out' }
    );

    this.animation.onfinish = () => this.onAnimationFinish(false);
    this.animation.oncancel = () => (this.isClosing = false);
  }

  onAnimationFinish(open) {
    this.details.open = open;
    this.animation = null;
    this.isClosing = false;
    this.isExpanding = false;
    this.details.style.height = '';
    this.details.style.overflow = '';
  }

  closeAccordionSiblings() {
    const parent = this.parentElement;
    if (!parent) return;

    parent.querySelectorAll(':scope > details-disclosure').forEach((sibling) => {
      if (sibling !== this && sibling.details?.open) sibling.close();
    });
  }
}

/* ============================================================================
   Register custom elements
   ========================================================================= */

customElements.define('quantity-input', QuantityInput);
customElements.define('menu-drawer', MenuDrawer);
customElements.define('header-drawer', HeaderDrawer);
customElements.define('modal-dialog', ModalDialog);
customElements.define('modal-opener', ModalOpener);
customElements.define('slider-component', SliderComponent);
customElements.define('slideshow-component', SlideshowComponent);
customElements.define('deferred-media', DeferredMedia);
customElements.define('variant-selects', VariantSelects);
customElements.define('variant-radios', VariantRadios);
customElements.define('localization-form', LocalizationForm);
customElements.define('show-more-button', ShowMoreButton);
customElements.define('details-disclosure', DetailsDisclosure);
