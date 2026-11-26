import { isConnected, isVisible } from '../../shared/dom.js';
import { getPopupViewport } from '../../shared/popupPosition.js';

const ROOT_SELECTOR = '.dialogContainer, .MuiPopover-root';
const MENU_SELECTOR = '.dialog.actionSheet, .MuiPopover-paper';
const ITEM_SELECTOR = '.actionSheetMenuItem, [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="option"]';
const NAVIGATION_EVENTS = ['hashchange', 'popstate', 'pagehide'];
const OBSERVER_OPTIONS = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'aria-selected', 'aria-checked', 'aria-disabled', 'aria-expanded', 'data-indeterminate', 'checked', 'disabled', 'value'] };
const KEY_CODES = { 13: 'Enter', 27: 'Escape', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 138: 'ArrowUp', 139: 'ArrowDown', 140: 'ArrowLeft', 141: 'ArrowRight', 195: 'Enter', 196: 'Escape', 203: 'ArrowUp', 204: 'ArrowDown', 205: 'ArrowLeft', 206: 'ArrowRight', 211: 'ArrowUp', 212: 'ArrowDown', 213: 'ArrowRight', 214: 'ArrowLeft', 461: 'Escape', 10009: 'Escape' };
const PLAYER_CLICK_GUARD = /\b(?:Firefox|Edge)[ /]/i.test(navigator.userAgent);
let nextMenuId = 0;

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function disabled(source) {
  return source.disabled || source.getAttribute('aria-disabled') === 'true' || Boolean(source.closest('.Mui-disabled, fieldset:disabled'));
}

function labelFor(source) {
  const label = source.querySelector('.actionSheetItemText, .MuiListItemText-primary');
  if (label) return label.textContent.trim();
  const copy = source.cloneNode(true);
  copy.querySelectorAll('svg, img, .material-icons, input, button').forEach((node) => node.remove());
  return source.getAttribute('aria-label') || copy.textContent.trim();
}

export function createMenuFeature() {
  const roots = new Map();
  const menus = new Map();
  const openers = new WeakMap();
  const previewSheets = new WeakSet();
  let observer = null;
  let resizeObserver = null;
  let frame = 0;
  let typeahead = '';
  let typeaheadTimer = 0;

  function active() {
    return Boolean(observer) && document.documentElement.classList.contains('sleekfin-menu-ui');
  }

  function sourceOpen(source, root) {
    return isConnected(source) && (source.matches('.actionSheet') || source.style.opacity !== '0') && !source.classList.contains('hide') && !source.classList.contains('hideForSlide') && !root.classList.contains('MuiModal-hidden') && root.getAttribute('aria-hidden') !== 'true' && !root.hidden;
  }

  function originals(record) {
    return Array.from(record.source.children).filter((node) => node !== record.popup);
  }

  function signature(record) {
    return originals(record).map((node) => node.outerHTML).join('') + Array.from(record.source.querySelectorAll('input')).filter((node) => !record.popup.contains(node)).map((node) => `${node.value}:${node.checked}:${node.indeterminate}`).join('|');
  }

  function canRestoreFocus(node) {
    return node && node !== document.body && isVisible(node) && !node.closest('[aria-hidden="true"], [inert], [data-sleekfin-header-source-anchor]') && window.getComputedStyle(node).opacity !== '0';
  }

  function onDialogOpen(event) {
    const source = event.target;
    if (!active() || !source.matches?.('.dialog.actionSheet')) return;
    const opener = document.activeElement;
    if (opener?.closest('[data-sleekfin-details-preview]')) {
      previewSheets.add(source);
      return;
    }
    if (!source.contains(opener) && canRestoreFocus(opener)) openers.set(source, opener);
  }

  function release(record) {
    menus.delete(record.source);
    record.source.removeEventListener('closing', record.onClosing);
    record.source.removeEventListener('close', record.onClose);
    resizeObserver?.unobserve(record.popup);
    record.popup.remove();
    openers.delete(record.source);
    if (record.listId && !record.list.id) record.list.id = record.listId;
    record.source.classList.remove('sleekfin-menu-host', 'sleekfin-menu-closing');
    if (![...menus.values()].some((other) => other.root === record.root)) {
      if (!record.legacy && (record.closing || !sourceOpen(record.source, record.root))) record.root.classList.add('sleekfin-menu-dismissed');
      // Jellyfin removes closing legacy backdrops 300 ms after the dialog closes.
      if (!record.legacy || !record.closing) record.backdrop?.classList.remove('sleekfin-menu-backdrop');
    }
    if (record.restoreFocus && canRestoreFocus(record.opener)) record.opener.focus({ preventScroll: true });
  }

  function close(record) {
    if (record.closing) return;
    record.closing = true;
    record.restoreFocus = record.legacy && !record.tv;
    record.popup.hidden = true;
    if (record.legacy) window.Dashboard?.dialogHelper?.close(record.source);
    else if (record.backdrop) record.backdrop.click();
    else record.source.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
  }

  function bind(record, node, source, row = false) {
    record.targets.set(node, source);
    if (row) record.rows.push({ node, source, label: labelFor(source) });
    return node;
  }

  function renderPart(source, record, root = false) {
    if (source.nodeType === 3) return document.createTextNode(source.textContent);
    if (source.nodeType !== 1 || source.hidden || source.getAttribute('aria-hidden') === 'true' && !source.matches('svg, .material-icons') || source.matches('script, style, input[type="hidden"], .hide, .MuiCollapse-hidden')) return null;
    if (!root && window.getComputedStyle(source).display === 'none') return null;
    const tag = source.tagName.toLowerCase();
    if (source.matches('.actionSheetTitle, .MuiListSubheader-root')) return element('div', 'sleekfin-menu-label', source.textContent);
    if (source.matches('.actionSheetText')) return element('p', 'sleekfin-menu-description', source.textContent);
    if (source.matches('.actionsheetDivider, .MuiDivider-root, hr')) return element('div', 'sleekfin-menu-separator');
    if (source.matches('.MuiCheckbox-root, .MuiRadio-root, .MuiSwitch-root')) {
      const input = source.querySelector('input');
      return input ? renderPart(input, record) : null;
    }
    if (source.matches('.MuiListItemIcon-root, .actionsheetMenuItemIcon, svg, img, .material-icons')) {
      const icon = element('span', 'sleekfin-menu-icon');
      icon.setAttribute('aria-hidden', 'true');
      const content = source.matches('.MuiListItemIcon-root') ? Array.from(source.childNodes) : [source];
      content.forEach((child) => {
        const copy = child.cloneNode(true);
        if (copy.nodeType === 1 && copy.classList.contains('material-icons')) {
          const classes = Array.from(copy.classList);
          copy.className = classes.slice(classes.indexOf('material-icons')).join(' ');
        }
        icon.appendChild(copy);
      });
      if (window.getComputedStyle(source).visibility === 'hidden') icon.style.visibility = 'hidden';
      return icon;
    }
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      const control = element(tag, tag === 'input' && ['checkbox', 'radio'].includes(source.type) ? 'sleekfin-menu-toggle' : 'sleekfin-menu-input');
      if (tag === 'input') control.type = source.type;
      if (tag === 'select') Array.from(source.children).forEach((option) => control.appendChild(option.cloneNode(true)));
      control.value = source.value;
      control.disabled = disabled(source);
      if (tag === 'input') {
        // Jellyfin filter handlers cancel checkbox clicks; MUI's class retains the controlled state.
        const switchBase = source.closest('.MuiCheckbox-root, .MuiRadio-root, .MuiSwitch-switchBase');
        control.checked = switchBase ? switchBase.classList.contains('Mui-checked') : source.checked;
        control.indeterminate = source.indeterminate || source.getAttribute('data-indeterminate') === 'true';
      }
      ['aria-label', 'placeholder', 'min', 'max', 'step'].forEach((name) => { if (source.hasAttribute(name)) control.setAttribute(name, source.getAttribute(name)); });
      return bind(record, control, source);
    }

    const button = tag === 'button' || source.matches('a[href], [role="button"]');
    const tool = button && Boolean(source.parentElement?.closest(ITEM_SELECTOR));
    const row = source.matches(ITEM_SELECTOR) || button && !tool;
    const complex = row && Boolean(source.querySelector('button, input, select, textarea, [role="button"]'));
    let node;
    if (row || button) {
      node = element(complex ? 'div' : 'button', row ? 'sleekfin-menu-item' : 'sleekfin-menu-tool');
      if (complex) node.classList.add('focusable');
      else node.type = 'button';
      node.tabIndex = row && !record.tv ? -1 : 0;
      if (!complex) node.disabled = disabled(source);
      if (source.title) node.title = source.title;
      const role = source.getAttribute('role') || (row ? 'menuitem' : null);
      if (role) node.setAttribute('role', role);
      const selected = source.getAttribute('aria-selected') === 'true' || source.classList.contains('Mui-selected');
      node.dataset.selected = String(selected);
      if (source.hasAttribute('aria-selected')) node.setAttribute('aria-selected', String(selected));
      if (source.hasAttribute('aria-checked')) node.setAttribute('aria-checked', source.getAttribute('aria-checked'));
      if (disabled(source)) node.setAttribute('aria-disabled', 'true');
      if (source.hasAttribute('aria-expanded')) node.setAttribute('aria-expanded', source.getAttribute('aria-expanded'));
      if (source.getAttribute('aria-label')) node.setAttribute('aria-label', source.getAttribute('aria-label'));
      bind(record, node, source, row);
    } else {
      let className = 'sleekfin-menu-group';
      if (tag === 'label' || source.classList.contains('MuiFormControlLabel-root')) className = 'sleekfin-menu-control';
      else if (source.matches('.actionsheetListItemBody, .MuiListItemText-root, .MuiAccordionSummary-content')) className = 'sleekfin-menu-copy';
      else if (source.matches('.actionSheetItemText, .MuiListItemText-primary')) className = 'sleekfin-menu-primary';
      else if (source.matches('.secondary, .MuiListItemText-secondary')) className = 'sleekfin-menu-secondary';
      else if (source.matches('.actionSheetItemAsideText')) className = 'sleekfin-menu-aside';
      node = element(tag === 'label' ? 'label' : tag === 'span' ? 'span' : 'div', className);
    }
    Array.from(source.childNodes).forEach((child) => {
      const part = renderPart(child, record);
      if (part) node.appendChild(part);
    });
    return node;
  }

  function render(record) {
    const previousFocus = document.activeElement;
    const focusedSource = record.targets.get(previousFocus) || null;
    const selection = typeof previousFocus.selectionStart === 'number' ? [previousFocus.selectionStart, previousFocus.selectionEnd] : null;
    const scrollTop = record.popup.scrollTop;
    record.targets = new WeakMap();
    record.rows = [];
    const fragment = document.createDocumentFragment();
    originals(record).forEach((source) => {
      const node = renderPart(source, record, true);
      if (node) fragment.appendChild(node);
    });
    record.popup.replaceChildren(fragment);
    record.popup.scrollTop = scrollTop;
    record.signature = signature(record);
    position(record);
    const focused = focusedSource && Array.from(record.popup.querySelectorAll('button, input, textarea, select, .focusable')).find((node) => record.targets.get(node) === focusedSource && !disabled(focusedSource));
    if (focusedSource && !isConnected(previousFocus)) {
      const target = focused || record.rows.find((row) => !disabled(row.source))?.node || record.popup;
      target.focus({ preventScroll: true });
      if (selection && focused && typeof focused.selectionStart === 'number') focused.setSelectionRange(...selection);
    }
  }

  function legacyPlacement(source, tv, root) {
    if (tv || !source.style.left || !source.style.top) return null;
    const left = parseFloat(source.style.left);
    const top = parseFloat(source.style.top);
    if (!Number.isFinite(left) || !Number.isFinite(top)) return null;
    const width = source.offsetWidth;
    const height = source.offsetHeight;
    const viewport = getPopupViewport();
    const rightGap = (root.clientWidth || viewport.width) - left - width;
    const bottomGap = (root.clientHeight || viewport.height) - top - height;
    return { left, top, width, height, horizontal: left <= 12 ? 'start' : rightGap >= -2 && rightGap <= 22 ? 'end' : 'center', vertical: top <= 12 ? 'start' : bottomGap >= -2 && bottomGap <= 22 ? 'end' : 'center', rightGap, bottomGap };
  }

  function position(record) {
    if (record.closing || record.popup.hidden) return;
    const { popup, source } = record;
    const viewport = getPopupViewport();
    const initialBounds = source.getBoundingClientRect();
    const scaleX = initialBounds.width / source.offsetWidth;
    const scaleY = initialBounds.height / source.offsetHeight;
    if (![scaleX, scaleY].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) return;
    const rootBounds = record.root.getBoundingClientRect();
    const measuredX = rootBounds.width / record.root.offsetWidth;
    const measuredY = rootBounds.height / record.root.offsetHeight;
    const rootScaleX = Number.isFinite(measuredX) && measuredX > 0 ? measuredX : scaleX;
    const rootScaleY = Number.isFinite(measuredY) && measuredY > 0 ? measuredY : scaleY;
    const rootLeft = rootBounds.left + record.root.clientLeft * rootScaleX;
    const rootTop = rootBounds.top + record.root.clientTop * rootScaleY;
    const rootRight = rootLeft + record.root.clientWidth * rootScaleX;
    const rootBottom = rootTop + record.root.clientHeight * rootScaleY;
    const frameLeft = Math.max(viewport.left, rootLeft);
    const frameTop = Math.max(viewport.top, rootTop);
    const frameRight = Math.min(viewport.right, rootRight);
    const frameBottom = Math.min(viewport.bottom, rootBottom);
    if (![frameLeft, frameTop, frameRight, frameBottom].every(Number.isFinite) || frameRight <= frameLeft || frameBottom <= frameTop) return;
    const margin = record.legacy ? 12 : 16;
    const widthLimit = Math.max(0, (frameRight - frameLeft - margin * 2) / scaleX);
    const heightLimit = Math.max(0, (frameBottom - frameTop - margin * 2) / scaleY);
    const inlineMinimum = record.role === 'listbox' ? parseFloat(source.style.minWidth) : 0;
    const minimum = Number.isFinite(inlineMinimum) && inlineMinimum > 0 ? inlineMinimum : record.nativeWidth;
    popup.style.minWidth = `${Math.min(minimum, widthLimit)}px`;
    popup.style.maxWidth = `${widthLimit}px`;
    const nativeHeight = record.formMaxHeight?.endsWith('%') ? (frameBottom - frameTop) / scaleY * parseFloat(record.formMaxHeight) / 100 : parseFloat(record.formMaxHeight) || heightLimit;
    popup.style.maxHeight = `${Math.min(heightLimit, record.kind === 'form' ? nativeHeight : heightLimit)}px`;
    if (record.kind === 'form') popup.style.width = `${Math.min(record.nativeWidth, widthLimit)}px`;
    const placementStyle = `${source.style.left}|${source.style.top}`;
    if (record.legacy && placementStyle !== record.placementStyle) {
      record.placement = legacyPlacement(source, record.fullscreen, record.root);
      record.placementStyle = placementStyle;
    }
    const bounds = source.getBoundingClientRect();
    const size = popup.getBoundingClientRect();
    const width = size.width;
    const height = size.height;
    if (![bounds.left, bounds.top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return;
    let left = bounds.left;
    let top = bounds.top;
    if (record.legacy) {
      const placement = record.placement;
      if (placement) {
        left = placement.horizontal === 'end' ? rootRight - placement.rightGap * rootScaleX - width : rootLeft + (placement.left + (placement.horizontal === 'center' ? placement.width / 2 : 0)) * rootScaleX - (placement.horizontal === 'center' ? width / 2 : 0);
        top = placement.vertical === 'end' ? rootBottom - placement.bottomGap * rootScaleY - height : rootTop + (placement.top + (placement.vertical === 'center' ? placement.height / 2 : 0)) * rootScaleY - (placement.vertical === 'center' ? height / 2 : 0);
      } else {
        left = frameLeft + (frameRight - frameLeft - width) / 2;
        top = frameTop + (frameBottom - frameTop - height) / 2;
      }
    }
    left = Math.max(frameLeft + margin, Math.min(left, frameRight - width - margin));
    top = Math.max(frameTop + margin, Math.min(top, frameBottom - height - margin));
    // Relative offsets keep native MUI measurements and positioning intact.
    popup.style.left = `${(left - bounds.left) / scaleX}px`;
    popup.style.top = `${(top - bounds.top) / scaleY}px`;
  }

  function scrollRow(record, node) {
    const bounds = node.getBoundingClientRect();
    const popupBounds = record.popup.getBoundingClientRect();
    const scaleY = popupBounds.height / record.popup.offsetHeight;
    if (!Number.isFinite(scaleY) || scaleY <= 0) return;
    const top = popupBounds.top + record.popup.clientTop * scaleY;
    const bottom = top + record.popup.clientHeight * scaleY;
    if (bounds.top < top) record.popup.scrollTop -= (top - bounds.top) / scaleY;
    else if (bounds.bottom > bottom) record.popup.scrollTop += (bounds.bottom - bottom) / scaleY;
  }

  function adopt(source, root) {
    if (previewSheets.has(source) || menus.has(source) || !sourceOpen(source, root)) return;
    const legacy = source.matches('.actionSheet');
    const activeSource = document.activeElement;
    const list = source.querySelector('[role="listbox"], [role="menu"]');
    if (!legacy && !list && !root.matches('#filter-popover')) return;
    const popup = element('div', 'sleekfin-menu-popup');
    const role = list?.getAttribute('role') || 'menu';
    popup.tabIndex = -1;
    popup.id = list?.id || `sleekfin-menu-${++nextMenuId}`;
    popup.setAttribute('role', list ? role : legacy ? 'menu' : 'group');
    ['aria-label', 'aria-labelledby', 'aria-multiselectable'].forEach((name) => { if (list?.hasAttribute(name)) popup.setAttribute(name, list.getAttribute(name)); });
    const fullscreen = legacy && source.classList.contains('actionsheet-fullscreen');
    const tv = fullscreen || document.documentElement.classList.contains('layout-tv');
    const playerClickGuard = legacy && PLAYER_CLICK_GUARD && Array.from(document.querySelectorAll('#videoOsdPage')).some(isVisible);
    const placement = legacy ? legacyPlacement(source, fullscreen, root) : null;
    const opener = openers.get(source) || (legacy && !source.contains(activeSource) && canRestoreFocus(activeSource) ? activeSource : null);
    const record = { source, root, popup, legacy, tv, fullscreen, playerClickGuard, role, kind: !legacy && !list ? 'form' : 'menu', opener, placement, placementStyle: `${source.style.left}|${source.style.top}`, nativeWidth: (fullscreen ? source.querySelector('.actionSheetScroller')?.offsetWidth : source.offsetWidth) || 0, formMaxHeight: window.getComputedStyle(source).maxHeight, list, listId: list?.id || '', rows: [], targets: new WeakMap(), closing: false, restoreFocus: false };
    record.backdrop = legacy ? source.backdrop || root.previousElementSibling : root.querySelector('.MuiBackdrop-root');
    record.onClosing = () => { record.closing = true; popup.hidden = true; source.classList.add('sleekfin-menu-closing'); if (legacy) record.backdrop?.classList.add('sleekfin-menu-backdrop-closing'); };
    record.onClose = () => release(record);
    menus.set(source, record);
    if (record.listId) list.removeAttribute('id');
    if (tv) popup.classList.add('focuscontainer');
    source.classList.add('sleekfin-menu-host');
    root.classList.remove('sleekfin-menu-dismissed');
    record.backdrop?.classList.add('sleekfin-menu-backdrop');
    // Stay inside Jellyfin's focus trap while its original controls keep their handlers.
    source.appendChild(popup);
    source.addEventListener('closing', record.onClosing);
    source.addEventListener('close', record.onClose);
    render(record);
    const rows = record.rows.filter((row) => !disabled(row.source));
    const first = rows.find((row) => row.source.hasAttribute('autofocus') || row.source === activeSource || row.node.dataset.selected === 'true') || rows.find((row) => row.source.matches(ITEM_SELECTOR)) || rows[0];
    (first?.node || popup).focus({ preventScroll: true });
    if (first) scrollRow(record, first.node);
    resizeObserver?.observe(popup);
    roots.get(root)?.takeRecords();
  }

  function reconcile() {
    frame = 0;
    if (!active()) return;
    roots.forEach((rootObserver, root) => {
      if (!isConnected(root)) {
        rootObserver.disconnect();
        roots.delete(root);
        return;
      }
      root.querySelectorAll(MENU_SELECTOR).forEach((source) => adopt(source, root));
    });
    menus.forEach((record) => {
      if (!sourceOpen(record.source, record.root)) release(record);
      else if (!record.closing && record.signature !== signature(record)) render(record);
      else position(record);
    });
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(reconcile);
  }

  function watch(root) {
    if (roots.has(root)) return;
    const rootObserver = new MutationObserver((changes) => {
      if (changes.some(({ target }) => !target.parentElement?.closest('.sleekfin-menu-popup') && !target.closest?.('.sleekfin-menu-popup'))) schedule();
    });
    roots.set(root, rootObserver);
    rootObserver.observe(root, OBSERVER_OPTIONS);
    schedule();
  }

  function inspect(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(ROOT_SELECTOR)) watch(node);
    else node.querySelectorAll(ROOT_SELECTOR).forEach(watch);
  }

  function observeParents() {
    observer.disconnect();
    observer.observe(document.body, { childList: true });
    const fullscreen = document.fullscreenElement || document.webkitFullscreenElement;
    if (fullscreen && fullscreen !== document.body) observer.observe(fullscreen, { childList: true });
    schedule();
  }

  function recordFor(target) {
    return [...menus.values()].reverse().find((record) => !record.closing && sourceOpen(record.source, record.root) && record.popup.contains(target));
  }

  function sourceFor(record, target) {
    for (let node = target; node && node !== record.popup; node = node.parentElement) {
      const source = record.targets.get(node);
      if (source) return source;
    }
    return null;
  }

  function onClick(event) {
    const record = recordFor(event.target);
    if (!record) return;
    if (event.target.matches('textarea, select, input:not([type="checkbox"], [type="radio"])')) return;
    if (event.target.closest('.sleekfin-menu-control') && !event.target.matches('input')) return;
    const source = sourceFor(record, event.target);
    if (!source) return;
    if (!event.target.matches('input[type="checkbox"], input[type="radio"]')) event.preventDefault();
    event.stopImmediatePropagation();
    if (!disabled(source) && isConnected(source)) {
      if (record.playerClickGuard) {
        // Jellyfin 12's player drops Firefox and legacy Edge clicks unless the click contains the last press target.
        const Pointer = window.PointerEvent;
        source.dispatchEvent(Pointer ? new Pointer('pointerdown') : new MouseEvent('mousedown'));
        source.dispatchEvent(Pointer ? new Pointer('pointerup') : new MouseEvent('mouseup'));
      }
      source.click();
    }
    schedule();
  }

  function onInput(event) {
    const record = recordFor(event.target);
    const source = record && sourceFor(record, event.target);
    if (!source) return;
    event.stopImmediatePropagation();
    if (event.target.matches('input[type="checkbox"], input[type="radio"]')) return;
    const prototype = source.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : source.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(source, event.target.value);
    source.dispatchEvent(new Event(event.type, { bubbles: true }));
  }

  function onKeyDown(event) {
    if (!active() || event.altKey || event.ctrlKey || event.metaKey) return;
    const record = recordFor(event.target);
    if (!record) return;
    const key = KEY_CODES[event.keyCode || event.which] || event.key;
    if (key === 'Tab') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!record.legacy && record.root.classList.contains('MuiMenu-root')) close(record);
      else {
        const controls = Array.from(record.popup.querySelectorAll('button, input, textarea, select, a[href], [tabindex]')).filter((node) => !disabled(node) && isVisible(node) && (node.tabIndex >= 0 || record.rows.some((row) => row.node === node)));
        const index = controls.indexOf(document.activeElement);
        const next = controls.length ? controls[(index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length] : record.popup;
        next.focus({ preventScroll: true });
        if (next !== record.popup) scrollRow(record, next);
      }
      return;
    }
    const editable = event.target.matches('textarea, select, input:not([type="checkbox"], [type="radio"])');
    if (key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      close(record);
      return;
    }
    if (editable || record.kind === 'form' && event.target.matches('input')) return;
    const rows = record.rows.filter(({ node, source }) => !disabled(source) && isVisible(node));
    const index = rows.findIndex(({ node }) => node === document.activeElement || node.contains(document.activeElement));
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const row = rows[index]?.node;
      const controls = row ? [row, ...row.querySelectorAll('button:not(:disabled), input:not(:disabled)')] : [];
      const current = controls.indexOf(document.activeElement);
      controls[Math.max(0, Math.min(current + (key === 'ArrowRight' ? 1 : -1), controls.length - 1))]?.focus({ preventScroll: true });
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    let next = -1;
    if (key === 'ArrowDown') next = (index + 1) % rows.length;
    else if (key === 'ArrowUp') next = index < 0 ? rows.length - 1 : (index + rows.length - 1) % rows.length;
    else if (key === 'Home') next = 0;
    else if (key === 'End') next = rows.length - 1;
    else if ((key === 'Enter' || key === ' ') && rows[index]?.node === document.activeElement && (record.playerClickGuard || !rows[index].node.matches('button'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
      rows[index]?.node.click();
      return;
    } else if (key?.length === 1 && key !== ' ') {
      const character = key.toLocaleLowerCase();
      typeahead = typeahead && Array.from(typeahead).every((value) => value === character) ? character : typeahead + character;
      window.clearTimeout(typeaheadTimer);
      typeaheadTimer = window.setTimeout(() => { typeahead = ''; }, 700);
      for (let offset = 1; offset <= rows.length; offset += 1) {
        const candidate = (index + offset + rows.length) % rows.length;
        if (rows[candidate].label.toLocaleLowerCase().startsWith(typeahead)) { next = candidate; break; }
      }
    }
    if (next < 0 || !rows[next]) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    rows[next].node.focus({ preventScroll: true });
    scrollRow(record, rows[next].node);
  }

  function onCommand(event) {
    let record = recordFor(event.target);
    if (!record) {
      const dialogs = document.querySelectorAll('.dialogContainer .dialog.opened');
      const topDialog = dialogs[dialogs.length - 1];
      record = [...menus.values()].find((entry) => !entry.closing && entry.legacy && entry.source === event.target && entry.source === topDialog);
    }
    const key = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', select: 'Enter', back: 'Escape' }[event.detail?.command];
    if (!record || !key) return;
    const focused = record.popup.contains(document.activeElement) ? document.activeElement : null;
    if (focused?.matches('select') || key !== 'Escape' && focused?.matches('textarea, input:not([type="checkbox"], [type="radio"])')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (key === 'Enter') (focused || record.rows.find((row) => !disabled(row.source))?.node)?.click();
    else record.popup.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  function onNavigation() {
    typeahead = '';
    window.clearTimeout(typeaheadTimer);
    schedule();
  }

  function onScroll(event) {
    if (!event.target.closest?.('.sleekfin-menu-popup')) schedule();
  }

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver((changes) => {
      changes.forEach(({ addedNodes }) => addedNodes.forEach(inspect));
      schedule();
    });
    resizeObserver = typeof window.ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    observeParents();
    document.querySelectorAll(ROOT_SELECTOR).forEach(watch);
    document.addEventListener('open', onDialogOpen, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('command', onCommand, true);
    document.addEventListener('fullscreenchange', observeParents);
    document.addEventListener('webkitfullscreenchange', observeParents);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', onScroll, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    NAVIGATION_EVENTS.forEach((name) => window.addEventListener(name, onNavigation));
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    resizeObserver?.disconnect();
    resizeObserver = null;
    roots.forEach((rootObserver) => rootObserver.disconnect());
    roots.clear();
    [...menus.values()].forEach(release);
    document.querySelectorAll('.sleekfin-menu-dismissed, .sleekfin-menu-backdrop, .sleekfin-menu-backdrop-closing').forEach((node) => node.classList.remove('sleekfin-menu-dismissed', 'sleekfin-menu-backdrop', 'sleekfin-menu-backdrop-closing'));
    document.removeEventListener('open', onDialogOpen, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('change', onInput, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('command', onCommand, true);
    document.removeEventListener('fullscreenchange', observeParents);
    document.removeEventListener('webkitfullscreenchange', observeParents);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('scroll', onScroll, true);
    window.visualViewport?.removeEventListener('resize', schedule);
    window.visualViewport?.removeEventListener('scroll', schedule);
    NAVIGATION_EVENTS.forEach((name) => window.removeEventListener(name, onNavigation));
    window.cancelAnimationFrame(frame);
    window.clearTimeout(typeaheadTimer);
    frame = typeaheadTimer = 0;
    typeahead = '';
  }

  return { start, stop };
}
