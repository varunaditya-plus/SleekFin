import { dom } from '../../shared/runtime.js';
import { createDropdown } from './dropdown.js';

const FIELDS = ['selectSource', 'selectVideo', 'selectAudio', 'selectSubtitles'];

function optionsFor(select) {
  return Array.from(select.options, (option) => ({ value: option.value, label: option.text }));
}

function containsTrackContext(node) {
  return node.nodeType === Node.ELEMENT_NODE
    && (node.matches('.detailPagePrimaryContainer, form.trackSelections') || node.querySelector('.detailPagePrimaryContainer, form.trackSelections'));
}

export function createTrackPickers(page, slot) {
  const pickers = new Map();
  let form = null;
  let originalParent = null;
  let originalNextSibling = null;
  let destroyed = false;
  let observer = null;
  let observedForm = null;
  let observedPrimary = null;
  let observedPrimaryParent = null;
  let timer = 0;

  if (slot) slot.hidden = true;

  function restoreForm(replacement = null) {
    if (form?.parentNode === slot && replacement && replacement !== form) {
      form.remove();
      return;
    }
    if (!form || form.parentNode !== slot || !dom.isConnected(originalParent)) return;
    originalParent.insertBefore(form, originalNextSibling?.parentNode === originalParent ? originalNextSibling : null);
  }

  function dispose(className) {
    const picker = pickers.get(className);
    if (!picker) return;
    picker.dropdown.destroy();
    picker.select.removeEventListener('change', picker.onNativeChange);
    picker.root.remove();
    picker.select.classList.remove('sleekfin-details-track-native');
    pickers.delete(className);
  }

  function createPicker(className, select, container) {
    const root = document.createElement('div');
    root.className = 'sleekfin-details-track';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'sleekfin-details-track-trigger';

    const label = document.createElement('span');
    label.className = 'sleekfin-details-track-label';
    label.textContent = container?.querySelector('.selectLabel')?.textContent?.trim()
      || select.getAttribute('aria-label')
      || select.name;

    const value = document.createElement('span');
    value.className = 'sleekfin-details-track-value';
    const chevron = document.createElement('span');
    chevron.className = 'sleekfin-details-track-chevron';
    trigger.append(label, value, chevron);
    root.appendChild(trigger);

    select.classList.add('sleekfin-details-track-native');
    const picker = { container, dropdown: null, onNativeChange: null, root, select, trigger, value };
    picker.dropdown = createDropdown({
      root,
      trigger,
      maxWidth: 520,
      options: optionsFor(select),
      value: select.value,
      onSelect(option) {
        if (select.value === option.value) return;
        select.value = option.value;
        value.textContent = option.label;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
    picker.onNativeChange = () => {
      value.textContent = select.options[select.selectedIndex]?.text || '';
      picker.dropdown.update(optionsFor(select), select.value);
    };
    select.addEventListener('change', picker.onNativeChange);
    container?.appendChild(root);
    pickers.set(className, picker);
    return picker;
  }

  function placeForm() {
    if (!slot) return;
    if (!form) {
      slot.hidden = true;
      slot.parentElement?.classList.remove('sleekfin-details-has-tracks');
      return;
    }
    const hasVisibleField = !form.classList.contains('hide') && FIELDS.some((className) => {
      const select = form.querySelector(`.${className}`);
      const container = select?.closest('.selectContainer');
      return container && !container.classList.contains('hide');
    });
    slot.hidden = !hasVisibleField;
    slot.parentElement?.classList.toggle('sleekfin-details-has-tracks', hasVisibleField);
    if (hasVisibleField && form.parentNode !== slot) {
      if (!originalParent) {
        originalParent = form.parentNode;
        originalNextSibling = form.nextSibling;
      }
      slot.appendChild(form);
    } else if (!hasVisibleField) {
      restoreForm();
    }
  }

  function sync() {
    if (destroyed || !dom.isConnected(page)) return;
    const currentForm = page.querySelector('.detailPagePrimaryContainer form.trackSelections')
      || (form && dom.isConnected(form) ? form : page.querySelector('form.trackSelections'));
    if (currentForm !== form) {
      Array.from(pickers.keys()).forEach(dispose);
      restoreForm(currentForm);
      form = currentForm;
      originalParent = form?.parentNode || null;
      originalNextSibling = form?.nextSibling || null;
    }
    watch();
    if (!form) {
      placeForm();
      return;
    }

    FIELDS.forEach((className) => {
      const select = form.querySelector(`.${className}`);
      let picker = pickers.get(className);
      if (!select) {
        dispose(className);
        return;
      }
      const container = select.closest('.selectContainer');
      if (picker && (picker.select !== select || picker.container !== container)) {
        dispose(className);
        picker = null;
      }
      if (!picker) picker = createPicker(className, select, container);

      const hidden = !container || container.classList.contains('hide');
      picker.root.hidden = hidden;
      picker.trigger.disabled = select.disabled;
      picker.value.textContent = select.options[select.selectedIndex]?.text || '';
      picker.dropdown.update(optionsFor(select), select.value);
    });

    placeForm();
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(sync, 60);
  }

  function watch() {
    if (destroyed) return;
    const primary = page.querySelector('.detailPagePrimaryContainer');
    const primaryParent = primary?.parentElement || null;
    if (observer && observedForm === form && observedPrimary === primary && observedPrimaryParent === primaryParent) return;
    observer?.disconnect();
    observer ||= new MutationObserver((records) => {
      if (records.some((record) => {
        if (record.type === 'attributes') {
          return record.attributeName === 'disabled' || record.target === form || record.target.matches('.selectContainer')
            || (record.oldValue || '').split(/\s+/).includes('selectContainer');
        }
        if (form && form.contains(record.target)) {
          return [...record.addedNodes, ...record.removedNodes]
            .some((node) => node.nodeType !== Node.ELEMENT_NODE || !node.classList.contains('sleekfin-details-track'));
        }
        return [...record.addedNodes, ...record.removedNodes].some(containsTrackContext);
      })) schedule();
    });
    observer.observe(page, { childList: true });
    if (!primary) observer.observe(page, { childList: true, subtree: true });
    else {
      observer.observe(primary, { childList: true, subtree: true });
      if (primaryParent && primaryParent !== page) observer.observe(primaryParent, { childList: true });
    }
    if (form) observer.observe(form, { attributes: true, attributeFilter: ['class', 'disabled'], attributeOldValue: true, childList: true, subtree: true });
    observedForm = form;
    observedPrimary = primary;
    observedPrimaryParent = primaryParent;
  }

  watch();
  sync();

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      observer = null;
      window.clearTimeout(timer);
      Array.from(pickers.keys()).forEach(dispose);
      restoreForm(page.querySelector('.detailPagePrimaryContainer form.trackSelections'));
    },
    reconcile() {
      if (destroyed) return;
      watch();
      sync();
    },
  };
}
