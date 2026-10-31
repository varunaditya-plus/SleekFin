import { decorateNativeButton, dom, restoreNativeButton } from '../../shared/runtime.js';
import { actionLabel, identifyAction, publishActionCatalog } from './actionCatalog.js';
import { DEFAULT_SETTINGS } from './settings.js';

const ENHANCED_LINKS = '.letterboxd-link, .seerr-link, .arr-link, .arr-tag-link';
const ENHANCED_BUTTONS = '.je-detail-hide-btn, .je-spoiler-blur-btn, .jellyseerr-report-issue-icon, .jellyseerr-report-unavailable-icon, .je-series-request-more-btn';
const OPTIONS = ['buttonContent', 'mobileActionGroups'];
const LENGTHS = ['desktopButtonHeight', 'mobileButtonHeight', 'desktopPlayIconSize', 'mobilePlayIconSize', 'buttonSpacing', 'controlIconSize', 'externalIconSize', 'buttonBlur', 'buttonHoverLift'];
const propertyName = (key) => `--sleekfin-details-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
const setAttribute = (element, name, value) => { if (element.getAttribute(name) !== String(value)) element.setAttribute(name, String(value)); };
const addClass = (element, name) => { if (!element.classList.contains(name)) element.classList.add(name); };

function backgroundColor(container, value, opacity) {
  const sample = document.createElement('span');
  sample.hidden = true;
  sample.style.color = value === 'Theme accent' ? 'var(--sleekfin-accent)' : value === 'Theme muted' ? 'var(--sleekfin-muted)' : value;
  container.appendChild(sample);
  const color = getComputedStyle(sample).color;
  sample.remove();
  const channels = color.match(/[\d.]+/g);
  return channels?.length >= 3 ? `rgba(${channels.slice(0, 3).join(', ')}, ${opacity * Number(channels[3] ?? 1)})` : value;
}

export function applyActionSettings(container, values, { mobile } = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...values };
  const properties = new Map();
  const attributes = new Map();
  const set = (key, value) => {
    const property = propertyName(key);
    properties.set(property, container.style.getPropertyValue(property));
    if (container.style.getPropertyValue(property) !== String(value)) container.style.setProperty(property, value);
  };
  const attribute = (key, value) => {
    const name = `data-sleekfin-details-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`;
    attributes.set(name, container.getAttribute(name));
    setAttribute(container, name, value);
  };
  LENGTHS.forEach((key) => set(key, `${settings[key]}px`));
  OPTIONS.forEach((key) => attribute(key, settings[key]));
  set('button-radius', { Square: '0px', Rounded: '12px', Pill: '999px' }[settings.buttonCornerStyle]);
  set('icon-button-radius', { Square: '0px', Rounded: '12px', Circle: '50%' }[settings.iconButtonCornerStyle]);
  ['primary', 'secondary'].forEach((kind) => {
    const color = settings[`${kind}ButtonTextColor`];
    set(`${kind}-button-text-color`, color === 'Theme accent' ? 'var(--sleekfin-accent)' : color === 'Theme muted' ? 'var(--sleekfin-muted)' : color);
    set(`${kind}-button-fill`, backgroundColor(container, settings[`${kind}ButtonBackgroundColor`], settings[`${kind}ButtonOpacity`] / 100));
    set(`${kind}-button-hover-fill`, backgroundColor(container, settings[`${kind}ButtonBackgroundColor`], settings.buttonHoverOpacity / 100));
  });
  set('button-active-color', settings.buttonActiveColor === 'Theme accent' ? 'var(--sleekfin-accent)' : settings.buttonActiveColor === 'Theme muted' ? 'var(--sleekfin-muted)' : settings.buttonActiveColor);
  set('button-group-flex', settings.buttonGroupSpacing === 'Auto' ? '1 1 0px' : `0 0 ${settings.buttonGroupSpacing}px`);
  set('button-group-margin', `${-settings.buttonSpacing / (settings.buttonGroupSpacing === 'Auto' ? 2 : 1)}px`);
  set('button-group-block-gap', `${settings.buttonGroupSpacing === 'Auto' ? settings.buttonSpacing : settings.buttonGroupSpacing}px`);
  if (mobile !== undefined) {
    attribute('action-preview', mobile ? 'mobile' : 'desktop');
    set('button-height', `${settings[mobile ? 'mobileButtonHeight' : 'desktopButtonHeight']}px`);
    set('play-icon-size', `${settings[mobile ? 'mobilePlayIconSize' : 'desktopPlayIconSize']}px`);
  }
  return () => {
    properties.forEach((value, property) => value ? container.style.setProperty(property, value) : container.style.removeProperty(property));
    attributes.forEach((value, name) => value === null ? container.removeAttribute(name) : container.setAttribute(name, value));
  };
}

export function createActions(container, page, initialSettings) {
  let settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  const records = new Map();
  const originalOrder = [...container.children];
  let frame = 0;
  let destroyed = false;
  let layoutSignature = '';
  const tv = document.documentElement.classList.contains('layout-tv');
  const actionLayout = { mobile: tv ? false : undefined };
  let restoreSettings = applyActionSettings(container, settings, actionLayout);
  addClass(container, 'sleekfin-details-actions');
  const spacer = document.createElement('span');
  spacer.className = 'sleekfin-details-action-spacer';
  spacer.hidden = true;
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sleekfin-icon-button sleekfin-control-3d sleekfin-details-action-control sleekfin-details-action-overflow-trigger';
  trigger.title = 'More actions';
  trigger.innerHTML = '<span class="material-icons more_vert"></span>';
  trigger.hidden = true;
  const overflow = document.createElement('div');
  overflow.className = 'sleekfin-details-action-overflow focuscontainer';
  overflow.hidden = true;
  container.append(spacer, trigger, overflow);

  function observe() {
    observer.observe(page, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'title', 'disabled', 'data-isfavorite', 'data-played', 'data-sleekfin-can-download'] });
  }

  function queue() {
    if (!destroyed && !frame) frame = requestAnimationFrame(() => { frame = 0; reconcile(); });
  }

  function adopt(control) {
    if (control.hasAttribute('data-sleekfin-enhanced-source')) return;
    const id = identifyAction(control);
    const unit = control.closest('.arr-dropdown') || control;
    if (!id || records.has(unit)) return;
    const enhanced = id.startsWith('je:');
    const record = { id, unit, control, source: null, icon: null, label: null, order: unit.style.order, menu: unit.querySelector('.arr-dropdown-menu') };
    record.menuLeft = record.menu?.style.left;
    if (unit.parentNode !== container && unit.parentNode !== overflow) {
      if (!enhanced) return;
      const source = document.createElement('span');
      source.className = [...control.classList].filter((name) => ['letterboxd-link', 'seerr-link', 'arr-link', 'arr-tag-link', 'je-series-request-more-btn'].includes(name)).join(' ');
      source.dataset.sleekfinEnhancedSource = 'true';
      if (control.dataset.itemId) source.dataset.itemId = control.dataset.itemId;
      source.hidden = true;
      unit.before(source);
      record.source = source;
      container.appendChild(unit);
    }
    if (enhanced) {
      addClass(unit, 'sleekfin-details-enhanced-action');
      addClass(control, 'sleekfin-details-enhanced-action');
      if (control.matches('.letterboxd-link') && !control.classList.contains('letterboxd-link-icon')) {
        addClass(control, 'letterboxd-link-icon');
        record.letterboxdIcon = true;
      }
      if (control.matches('.seerr-link, .arr-link') && !control.querySelector('img')) {
        const asset = { 'je:seerr': 'seerr.svg', 'je:sonarr': 'sonarr.svg', 'je:radarr': 'radarr-light-hybrid-light.svg', 'je:bazarr': 'bazarr.svg' }[id];
        if (asset && window.JellyfinEnhanced?.cdn?.selfhst) {
          record.icon = document.createElement('img');
          record.icon.src = window.JellyfinEnhanced.cdn.selfhst(`svg/${asset}`);
          record.icon.alt = actionLabel(control, id);
          control.appendChild(record.icon);
        }
      }
    }
    addClass(control, 'sleekfin-details-action-control');
    setAttribute(unit, 'data-sleekfin-action-id', id);
    records.set(unit, record);
  }

  function release(record, restore) {
    const { unit, control, source } = record;
    if (unit.parentNode === overflow) container.appendChild(unit);
    if (source) {
      if (restore && page.contains(source)) source.replaceWith(unit);
      else unit.remove();
      source.remove();
    }
    record.icon?.remove();
    record.label?.remove();
    if (record.menu) record.menu.style.left = record.menuLeft;
    if (record.letterboxdIcon) control.classList.remove('letterboxd-link-icon');
    restoreNativeButton(control);
    unit.style.order = record.order;
    unit.removeAttribute('data-sleekfin-action-id');
    unit.removeAttribute('data-sleekfin-action-hidden');
    unit.removeAttribute('data-sleekfin-action-first-right');
    unit.removeAttribute('data-sleekfin-action-first-row');
    unit.classList.remove('sleekfin-details-enhanced-action');
    control.classList.remove('sleekfin-details-enhanced-action', 'sleekfin-details-action-control', 'sleekfin-control-3d');
    records.delete(unit);
  }

  function available(record) {
    const { control, unit, id } = record;
    if (control.hidden || unit.hidden) return false;
    if (id === 'download' && container.dataset.sleekfinCanDownload === 'true') return true;
    return !control.classList.contains('hide') && !unit.classList.contains('hide');
  }

  function decorate(record) {
    const { control, id } = record;
    const label = actionLabel(control, id);
    const content = control.querySelector('.detailButton-content') || control;
    if (['play', 'replay', 'download', 'favorite'].includes(id)) {
      if (record.content !== content || record.caption !== label || !control.classList.contains('sleekfin-button')) {
        decorateNativeButton(control, { content, icon: id, label, variant: id === 'play' ? 'primary' : 'control' });
        record.content = content;
        record.caption = label;
      }
    } else {
      if (!record.label || !control.contains(record.label)) {
        record.label = document.createElement('span');
        record.label.className = 'sleekfin-details-action-label';
        content.appendChild(record.label);
      }
      if (record.label.textContent !== label) record.label.textContent = label;
      addClass(control, 'sleekfin-control-3d');
    }
  }

  function closeOverflow(restoreFocus = false) {
    const focused = overflow.contains(document.activeElement);
    overflow.hidden = true;
    if (restoreFocus && focused && document.documentElement.classList.contains('layout-tv') && dom.isVisible(trigger)) trigger.focus();
  }

  function toggleOverflow() {
    if (!overflow.hidden) { closeOverflow(true); return; }
    overflow.hidden = false;
    requestAnimationFrame(() => {
      if (destroyed || overflow.hidden) return;
      positionMenus();
      if (document.documentElement.classList.contains('layout-tv')) {
        Array.from(overflow.querySelectorAll('button:not(:disabled), a[href], .focusable')).find(dom.isVisible)?.focus();
      }
    });
  }

  function positionMenus() {
    records.forEach(({ unit, menu }) => {
      if (menu && unit.classList.contains('open')) {
        const origin = unit.getBoundingClientRect().left;
        const left = `${Math.max(16 - origin, Math.min(0, window.innerWidth - 16 - origin - menu.offsetWidth))}px`;
        if (menu.style.left !== left) menu.style.left = left;
      }
    });
    if (!overflow.hidden) {
      const above = window.innerHeight - trigger.getBoundingClientRect().bottom < overflow.offsetHeight + 20 && trigger.getBoundingClientRect().top > overflow.offsetHeight + 20;
      const top = above ? 'auto' : '';
      const bottom = above ? 'calc(100% + 10px)' : '';
      if (overflow.style.top !== top) overflow.style.top = top;
      if (overflow.style.bottom !== bottom) overflow.style.bottom = bottom;
    }
  }

  function layoutOverflow(visible) {
    const width = container.clientWidth;
    if ((!tv && settings.buttonOverflow !== 'More') || !width) { trigger.hidden = true; closeOverflow(); return; }
    const gap = settings.buttonSpacing;
    const mobile = container.dataset.sleekfinDetailsActionPreview === 'mobile' || container.dataset.sleekfinDetailsActionPreview !== 'desktop' && window.innerWidth < 768;
    const stack = mobile && settings.mobileActionGroups === 'Stack';
    const groups = [visible.filter((record) => record.side === 'left'), visible.filter((record) => record.side === 'right')];
    const displaced = [];
    const triggerWidth = mobile ? settings.mobileButtonHeight : settings.desktopButtonHeight;
    const widths = new Map(visible.map((record) => [record, record.unit.offsetWidth]));
    const rowWidth = (items, extra = false) => items.reduce((sum, record) => sum + widths.get(record), extra ? triggerWidth : 0) + Math.max(0, items.length + Number(extra) - 1) * gap;
    const removeTail = (items, fits) => {
      for (let index = items.length - 1; index >= 0 && !fits(); index--) {
        const record = items[index];
        // Spoiler Guard inserts directly before Jellyfin's More button.
        if (record.id === 'more') continue;
        displaced.push(record);
        items.splice(index, 1);
      }
    };
    if (stack) {
      removeTail(groups[0], () => rowWidth(groups[0]) <= width);
      if (displaced.length || rowWidth(groups[1]) > width) removeTail(groups[1], () => rowWidth(groups[1], true) <= width);
    } else {
      const remaining = [...visible];
      const fits = (extra) => {
        const left = remaining.filter((record) => record.side === 'left');
        const right = remaining.filter((record) => record.side === 'right');
        const between = left.length && (right.length || extra) ? settings.buttonGroupSpacing === 'Auto' ? gap : settings.buttonGroupSpacing : 0;
        return rowWidth(left) + rowWidth(right, extra) + between <= width;
      };
      if (!fits(false)) removeTail(remaining, () => fits(true));
    }
    if (displaced.length) {
      displaced.sort((a, b) => Number(a.unit.style.order) - Number(b.unit.style.order)).forEach(({ unit }) => overflow.appendChild(unit));
      trigger.style.order = '20000';
      trigger.hidden = false;
    } else { trigger.hidden = true; closeOverflow(); }
  }

  function reconcile() {
    if (destroyed || !page.isConnected || page.classList.contains('hide') || !page.contains(container)) return;
    observer.disconnect();
    try {
      records.forEach((record) => {
        if (!container.contains(record.unit) || !record.unit.contains(record.control) && record.unit !== record.control || record.source && !page.contains(record.source)) release(record, false);
      });
      page.querySelectorAll('.itemExternalLinks').forEach((links) => links.querySelectorAll(ENHANCED_LINKS).forEach(adopt));
      page.querySelectorAll(ENHANCED_BUTTONS).forEach(adopt);
      [...container.children].forEach((unit) => {
        if (unit.matches('.arr-dropdown')) { const control = unit.querySelector('.arr-link'); if (control) adopt(control); }
        else adopt(unit);
      });
      const left = settings.leftActions || DEFAULT_SETTINGS.leftActions;
      const right = settings.rightActions || DEFAULT_SETTINGS.rightActions;
      const hidden = settings.hiddenActions || [];
      let unlisted = left.length;
      const visible = [];
      records.forEach((record) => {
        decorate(record);
        const index = left.indexOf(record.id);
        const rightIndex = right.indexOf(record.id);
        record.side = index >= 0 || rightIndex < 0 ? 'left' : 'right';
        setAttribute(record.unit, 'data-sleekfin-action-hidden', hidden.includes(record.id));
        const order = index >= 0 ? index : rightIndex >= 0 ? 10000 + rightIndex : unlisted++;
        if (record.unit.style.order !== String(order)) record.unit.style.order = order;
        const isVisible = available(record);
        record.available = isVisible && !record.control.disabled && record.control.getAttribute('aria-disabled') !== 'true' && !record.control.classList.contains('jellyseerr-report-unavailable-icon');
        if (isVisible && !hidden.includes(record.id)) visible.push(record);
      });
      visible.sort((a, b) => Number(a.unit.style.order) - Number(b.unit.style.order));
      const nextLayout = JSON.stringify([container.clientWidth, window.innerWidth, settings.buttonOverflow, settings.mobileActionGroups, settings.buttonSpacing, settings.buttonGroupSpacing, settings.buttonContent, settings.desktopButtonHeight, settings.mobileButtonHeight, visible.map(({ id, side, unit, control }) => [id, side, unit.style.order, control.title, control.className])]);
      const layoutChanged = nextLayout !== layoutSignature;
      if (layoutChanged) {
        const focused = container.contains(document.activeElement) ? document.activeElement : null;
        const ordered = [...records.values()].sort((a, b) => Number(a.unit.style.order) - Number(b.unit.style.order));
        const units = [...ordered.filter((record) => record.side === 'left').map(({ unit }) => unit), spacer, ...ordered.filter((record) => record.side === 'right').map(({ unit }) => unit), trigger, overflow];
        let next = null;
        units.reverse().forEach((unit) => {
          if (unit.parentNode !== container || unit.nextSibling !== next) container.insertBefore(unit, next);
          next = unit;
        });
        layoutOverflow(visible);
        if (focused) {
          if (dom.isVisible(focused)) focused.focus();
          else if (!trigger.hidden) trigger.focus();
        }
        layoutSignature = nextLayout;
      }
      const inline = visible.filter(({ unit }) => unit.parentNode === container);
      const rightControls = inline.filter((record) => record.side === 'right').sort((a, b) => Number(a.unit.style.order) - Number(b.unit.style.order));
      const hasLeft = inline.some((record) => record.side === 'left');
      const showSpacer = Boolean(rightControls.length || !trigger.hidden);
      if (spacer.hidden === showSpacer) spacer.hidden = !showSpacer;
      setAttribute(spacer, 'data-sleekfin-no-left-actions', !hasLeft);
      records.forEach((record) => setAttribute(record.unit, 'data-sleekfin-action-first-right', rightControls[0] === record));
      setAttribute(trigger, 'data-sleekfin-action-first-right', !rightControls.length && !trigger.hidden);
      if (layoutChanged) {
        records.forEach(({ unit }) => setAttribute(unit, 'data-sleekfin-action-first-row', false));
        setAttribute(trigger, 'data-sleekfin-action-first-row', false);
        const mobile = container.dataset.sleekfinDetailsActionPreview === 'mobile' || container.dataset.sleekfinDetailsActionPreview !== 'desktop' && window.innerWidth < 768;
        if (hasLeft && mobile && settings.mobileActionGroups === 'Stack') {
          const right = [...rightControls.map(({ unit }) => unit), ...(trigger.hidden ? [] : [trigger])];
          const firstTop = Math.min(...right.map((unit) => unit.getBoundingClientRect().top));
          right.forEach((unit) => setAttribute(unit, 'data-sleekfin-action-first-row', Math.abs(unit.getBoundingClientRect().top - firstTop) < 1));
        }
      }
      publishActionCatalog([...records.values()], page.dataset.sleekfinItemType, page.dataset.sleekfinItemId);
      positionMenus();
    } finally { if (!destroyed) observe(); }
  }

  function onClick(event) {
    if (event.target.closest('.arr-dropdown')) requestAnimationFrame(positionMenus);
    if (event.target.closest('.sleekfin-details-action-overflow-trigger') === trigger) toggleOverflow();
    else if (!overflow.contains(event.target)) closeOverflow();
  }

  function onOutside(event) { if (!container.contains(event.target)) closeOverflow(); }
  function onKey(event) {
    if (overflow.hidden || event.target !== trigger && !overflow.contains(event.target)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeOverflow(true);
    }
  }
  function onCommand(event) {
    if (!document.documentElement.classList.contains('layout-tv') || overflow.hidden || event.detail?.command !== 'back') return;
    event.preventDefault();
    event.stopPropagation();
    closeOverflow(true);
  }
  const observer = new MutationObserver(queue);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null;
  resizeObserver?.observe(container);
  container.addEventListener('click', onClick, true);
  container.addEventListener('command', onCommand);
  document.addEventListener('click', onOutside);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', queue);
  observe();
  reconcile();

  return {
    update(values) {
      observer.disconnect();
      restoreSettings();
      settings = { ...DEFAULT_SETTINGS, ...values };
      restoreSettings = applyActionSettings(container, settings, actionLayout);
      layoutSignature = '';
      reconcile();
    },
    reconcile,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resizeObserver?.disconnect();
      container.removeEventListener('click', onClick, true);
      container.removeEventListener('command', onCommand);
      document.removeEventListener('click', onOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', queue);
      records.forEach((record) => release(record, true));
      originalOrder.reverse().forEach((unit) => { if (unit.parentNode === container) container.prepend(unit); });
      spacer.remove();
      trigger.remove();
      overflow.remove();
      restoreSettings();
      container.classList.remove('sleekfin-details-actions');
    },
  };
}
