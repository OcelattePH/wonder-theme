/*
 * customer.js -- Customer account pages
 * Handles address form country/province cascading.
 */

const selectors = {
  customerAddresses: '[data-customer-addresses]',
  addressCountrySelect: '[data-address-country-select]',
  addressContainer: '[data-address]',
  toggleAddressButton: 'button[aria-expanded]',
  cancelAddressButton: 'button[data-cancel]',
  deleteAddressButton: 'button[data-delete]',
};

const attributes = {
  expanded: 'aria-expanded',
  confirmMessage: 'data-confirm-message',
};

class CustomerAddresses {
  constructor() {
    this.elements = document.querySelector(selectors.customerAddresses);
    if (!this.elements) return;
    this.setupCountries();
    this.setupEventListeners();
  }

  setupCountries() {
    if (typeof Shopify === 'undefined' || typeof Shopify.CountryProvinceSelector === 'undefined') return;

    const countrySelects = this.elements.querySelectorAll(selectors.addressCountrySelect);
    countrySelects.forEach((select) => {
      const formId = select.dataset.formId;
      // eslint-disable-next-line no-new
      new Shopify.CountryProvinceSelector(
        `AddressCountry_${formId}`,
        `AddressProvince_${formId}`,
        { hideElement: `AddressProvinceContainer_${formId}` }
      );
    });
  }

  setupEventListeners() {
    this.elements.querySelectorAll(selectors.toggleAddressButton).forEach((button) => {
      button.addEventListener('click', this.handleToggleAddress.bind(this));
    });

    this.elements.querySelectorAll(selectors.cancelAddressButton).forEach((button) => {
      button.addEventListener('click', this.handleCancelAddress.bind(this));
    });

    this.elements.querySelectorAll(selectors.deleteAddressButton).forEach((button) => {
      button.addEventListener('click', this.handleDeleteAddress.bind(this));
    });
  }

  handleToggleAddress(event) {
    const target = event.currentTarget;
    const addressId = target.dataset.addressId;
    const container = this.elements.querySelector(`[data-address-id="${addressId}"]`);
    if (!container) return;

    const isExpanded = target.getAttribute(attributes.expanded) === 'true';
    target.setAttribute(attributes.expanded, !isExpanded);
    container.classList.toggle('hidden', isExpanded);
  }

  handleCancelAddress(event) {
    const container = event.currentTarget.closest(selectors.addressContainer);
    if (!container) return;

    const toggleBtn = this.elements.querySelector(`[data-address-id="${container.dataset.addressId}"]`);
    if (toggleBtn) {
      toggleBtn.setAttribute(attributes.expanded, 'false');
    }
    container.classList.add('hidden');
  }

  handleDeleteAddress(event) {
    const target = event.currentTarget;
    const message = target.getAttribute(attributes.confirmMessage);
    // eslint-disable-next-line no-alert
    if (confirm(message || 'Are you sure you want to delete this address?')) {
      const form = target.closest('form') || document.getElementById(target.dataset.formId);
      if (form) {
        Shopify.postLink(target.dataset.target, { parameters: { _method: 'delete' } });
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-new
  new CustomerAddresses();
});
