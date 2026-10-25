import { dom, h, render } from '../../shared/runtime.js';
import { HeaderOverflowDrawer } from './HeaderOverflowDrawer.jsx';
import { cloneSourceTemplate, currentSource, discoverHeaderControls, legacyAlias, refreshRecordVisual } from './inventory.js';
import { mark, setStyle } from './shared.js';

function recordForKey(key, discoveries) {
  return discoveries.find((record) => record.key === key) || legacyAlias(key, discoveries);
}

function resolveRecords(mount, settings) {
  const discoveries = discoverHeaderControls(mount);
  const customized = Boolean(settings.itemOrder.length || settings.hiddenItems.length);
  if (!customized) {
    const records = discoveries.filter((record) => record.inline);
    return { customized: Boolean(records.length), hidden: [], records };
  }

  const hidden = [];
  const hiddenSources = new Set();
  settings.hiddenItems.forEach((key) => {
    const record = recordForKey(key, discoveries);
    if (record && !hiddenSources.has(record.source)) {
      hiddenSources.add(record.source);
      hidden.push(record);
    }
  });

  const records = [];
  const usedKeys = new Set(settings.hiddenItems);
  const usedSources = new Set(hiddenSources);
  settings.itemOrder.forEach((key) => {
    usedKeys.add(key);
    if (key === 'space' || key === 'separator') {
      if (!settings.hiddenItems.includes(key)) records.push({ key, source: null });
      return;
    }

    const record = recordForKey(key, discoveries);
    if (record && !hiddenSources.has(record.source)) {
      usedSources.add(record.source);
      records.push({ ...record, key });
    }
  });

  discoveries.forEach((record) => {
    if (record.inline && !usedKeys.has(record.key) && !usedSources.has(record.source)) {
      usedSources.add(record.source);
      records.push(record);
    }
  });
  return { customized, hidden, records };
}

function createStructuralItem(key) {
  const item = document.createElement('span');
  item.setAttribute(key === 'space' ? 'data-sleekfin-header-space' : 'data-sleekfin-header-separator', 'true');
  return item;
}

function sourceTitle(record) {
  return record.source.getAttribute('title')?.trim() || record.source.getAttribute('aria-label')?.trim() || record.caption;
}

function sourceDisabled(record) {
  return Boolean(record.source.disabled) || record.source.getAttribute('aria-disabled') === 'true';
}

function renderProxyVisual(record) {
  const template = cloneSourceTemplate(record.template);
  record.button.textContent = '';
  while (template.firstChild) record.button.appendChild(template.firstChild);
  const shape = record.template.getAttribute('data-sleekfin-header-source-visual');
  if (shape === 'icon-only') record.button.setAttribute('data-sleekfin-header-icon-only', 'true');
  else record.button.removeAttribute('data-sleekfin-header-icon-only');
  record.button.disabled = sourceDisabled(record);
  record.button.style.display = record.nativeHidden ? 'none' : '';
  record.button.title = sourceTitle(record);
}

function activateSource(mount, record) {
  const route = (window.location.hash || '').toLowerCase();
  const homeRoute = !route || /^#\/home(?:\.html)?(?:[?]|$)/.test(route);
  if (mount.kind === 'legacy' && !homeRoute && record.key.startsWith('sf:')) {
    window.location.hash = `#/home?seerrfinTab=${record.key.slice(3)}`;
    return;
  }
  if (mount.kind === 'legacy' && !homeRoute && record.key.startsWith('je:')) {
    const index = record.source.getAttribute('data-index');
    if (index) {
      window.location.hash = `#/home?tab=${index}`;
      return;
    }
  }
  record.source.click();
}

function createProxyButton(mount, record) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-sleekfin-header-proxy-item', record.key);
  record.button = button;
  renderProxyVisual(record);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if (dom.isConnected(record.source) && !sourceDisabled(record)) {
      syncPopupAnchors(mount, record, button);
      activateSource(mount, record);
      window.setTimeout(() => {
        if (mount.active) refreshHeaderProxy(mount);
      }, 0);
    }
  });
  return button;
}

function createOverflowToggle() {
  const button = document.createElement('button');
  const caret = document.createElement('span');
  button.type = 'button';
  button.title = 'More header items';
  button.setAttribute('data-sleekfin-header-overflow-toggle', 'true');
  button.setAttribute('data-sleekfin-header-overflow-hidden', 'true');
  caret.setAttribute('data-sleekfin-header-overflow-caret', 'true');
  button.appendChild(caret);
  return button;
}

function createOverflowController(mount, toggle) {
  const root = document.createElement('div');
  let open = false;
  let records = [];
  document.body.appendChild(root);

  function close() {
    if (!open) return;
    open = false;
    render(null, root);
  }

  function activate(record, anchor) {
    if (!record.source || !dom.isConnected(record.source) || sourceDisabled(record)) return;
    syncPopupAnchors(mount, record, anchor);
    close();
    activateSource(mount, record);
    window.setTimeout(() => {
      if (mount.active) refreshHeaderProxy(mount);
    }, 0);
  }

  function draw() {
    if (!open) return;
    if (!records.length || !dom.isConnected(toggle)) {
      close();
      return;
    }
    render(h(HeaderOverflowDrawer, { anchor: toggle, onActivate: activate, onClose: close, records }), root);
  }

  function sync(nextRecords) {
    records = nextRecords.map((record) => ({ ...record, current: record.source ? currentSource(record) : false, disabled: record.source ? sourceDisabled(record) : false }));
    draw();
  }

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!records.length) return;
    open = !open;
    draw();
  });

  return {
    close,
    destroy() {
      render(null, root);
      root.remove();
    },
    sync,
  };
}

function proxyContentOverflows(mount) {
  const proxyBounds = mount.proxy.getBoundingClientRect();
  let left = Math.max(0, proxyBounds.left);
  let right = Math.min(window.innerWidth, proxyBounds.right);
  let parent = mount.proxy.parentElement;
  while (parent) {
    if (/^(?:auto|clip|hidden|scroll)$/.test(window.getComputedStyle(parent).overflowX)) {
      const parentBounds = parent.getBoundingClientRect();
      left = Math.max(left, parentBounds.left);
      right = Math.min(right, parentBounds.right);
    }
    parent = parent.parentElement;
  }
  const children = [...mount.proxyEntries.map((entry) => entry.element), mount.overflowToggle].filter(
    (element) => element.getAttribute('data-sleekfin-header-overflowed') !== 'true' && element.getAttribute('data-sleekfin-header-overflow-hidden') !== 'true' && dom.isVisible(element),
  );
  return mount.proxy.scrollWidth > mount.proxy.clientWidth + 1 || children.some((element) => {
    const bounds = element.getBoundingClientRect();
    return bounds.left < left - 1 || bounds.right > right + 1;
  });
}

function updateOverflow(mount) {
  if (!mount.proxy) return;

  mount.proxyEntries.forEach((entry) => entry.element.setAttribute('data-sleekfin-header-overflowed', 'false'));
  mount.overflowToggle.setAttribute('data-sleekfin-header-overflow-hidden', 'true');
  if (!proxyContentOverflows(mount)) {
    mount.proxy.setAttribute('data-sleekfin-header-overflow-active', 'false');
    mount.overflow.sync([]);
    mount.updateBrandOverlap?.();
    return;
  }

  mount.proxy.setAttribute('data-sleekfin-header-overflow-active', 'true');
  mount.overflowToggle.setAttribute('data-sleekfin-header-overflow-hidden', 'false');
  for (let index = mount.proxyEntries.length - 1; index >= 0 && proxyContentOverflows(mount); index -= 1) {
    const element = mount.proxyEntries[index].element;
    if (dom.isVisible(element)) element.setAttribute('data-sleekfin-header-overflowed', 'true');
  }
  const records = mount.proxyEntries.filter((entry) => entry.element.getAttribute('data-sleekfin-header-overflowed') === 'true').map((entry) => entry.record);
  const hasItems = records.some((record) => record.source);
  if (!hasItems) mount.overflowToggle.setAttribute('data-sleekfin-header-overflow-hidden', 'true');
  mount.overflow.sync(hasItems ? records : []);
  mount.updateBrandOverlap?.();
}

function scheduleHeaderProxyLayout(mount) {
  if (!mount.proxy || !mount.active || mount.proxyFrame) return;
  mount.proxyFrame = window.requestAnimationFrame(() => {
    mount.proxyFrame = 0;
    if (mount.active && dom.isConnected(mount.proxy)) updateOverflow(mount);
  });
}

function markEmptySegments(mount) {
  const sources = new Set([...mount.proxyRecords, ...mount.hiddenRecords].filter((record) => !record.fallback).map((record) => record.source));
  const markSegment = (segment) => {
    if (!segment) return;
    const controls = Array.from(segment.querySelectorAll('button, a[href]')).filter(
      (source) =>
        !source.closest('[data-sleekfin-header-proxy]') &&
        !source.matches('[data-sleekfin-header-brand], .je-header-more-toggle, .mainDrawerButton'),
    );
    mark(mount, segment, 'data-sleekfin-header-all-proxied', controls.every((source) => sources.has(source)) ? 'true' : 'false');
  };
  markSegment(mount.nav);
  markSegment(mount.actions);
  markSegment(mount.profile);
}

function hideProviderWrappers(mount) {
  const randomContainer = mount.header.querySelector('#randomItemButtonContainer');
  if (randomContainer) {
    mark(mount, randomContainer, 'data-sleekfin-header-source-hidden', mount.hiddenSources.has(randomContainer.querySelector('#randomItemButton')) ? 'true' : 'false');
  }

  const enhancedGroup = mount.header.querySelector('#je-native-tabs-group');
  if (enhancedGroup) {
    const hasUnmanagedButton = Array.from(enhancedGroup.querySelectorAll('button')).some((button) => !mount.hiddenSources.has(button));
    mark(mount, enhancedGroup.querySelector('#je-native-tabs-separator'), 'data-sleekfin-header-source-hidden', hasUnmanagedButton ? 'false' : 'true');
  }

  const enhancedTray = mount.header.querySelector('#je-header-buttons-group');
  if (enhancedTray) {
    const hasUnmanagedButton = Array.from(enhancedTray.querySelectorAll('button, a')).some(
      (button) => !button.classList.contains('je-header-more-toggle') && !mount.hiddenSources.has(button),
    );
    const hasPopupAnchor = Boolean(enhancedTray.querySelector('[data-sleekfin-header-source-anchor]'));
    mark(mount, enhancedTray, 'data-sleekfin-header-source-hidden', !hasUnmanagedButton && !hasPopupAnchor ? 'true' : 'false');
    mark(mount, enhancedTray, 'data-sleekfin-header-all-proxied', !hasUnmanagedButton ? 'true' : 'false');
  }
}

function hideSources(mount) {
  mount.hiddenSources = new Set();
  mount.proxyRecords.forEach((record) => {
    if (record.fallback) return;
    mount.hiddenSources.add(record.source);
    if (record.popup) {
      mark(mount, record.source, 'data-sleekfin-header-source-anchor');
      mark(mount, record.source, 'tabindex', '-1');
    } else {
      mark(mount, record.source, 'data-sleekfin-header-source-hidden');
    }
  });
  mount.hiddenRecords.forEach((record) => {
    if (!record.fallback) {
      mount.hiddenSources.add(record.source);
      mark(mount, record.source, 'data-sleekfin-header-source-hidden');
    }
  });
  hideProviderWrappers(mount);
  markEmptySegments(mount);
}

function syncPopupAnchors(mount, activeRecord, activeAnchor) {
  (activeRecord ? [activeRecord] : mount.proxyRecords).forEach((record) => {
    const anchor = activeRecord ? activeAnchor : record.button;
    if (!record.popup || record.fallback || !dom.isConnected(anchor) || (!activeRecord && record.button.getAttribute('data-sleekfin-header-overflowed') === 'true')) return;

    const rectangle = anchor.getBoundingClientRect();
    setStyle(mount, record.source, 'left', `${Math.round(rectangle.left)}px`, 'important');
    setStyle(mount, record.source, 'top', `${Math.round(rectangle.top)}px`, 'important');
    setStyle(mount, record.source, 'height', `${Math.max(1, Math.round(rectangle.height))}px`, 'important');
    setStyle(mount, record.source, 'width', `${Math.max(1, Math.round(rectangle.width))}px`, 'important');
  });
}

export function createHeaderProxy(mount, parent, before, settings) {
  const resolved = resolveRecords(mount, settings);
  if (!resolved.customized) return null;

  const proxy = document.createElement('div');
  proxy.setAttribute('data-sleekfin-header-proxy', mount.kind);
  mount.proxyEntries = resolved.records.map((record) => {
    const element = record.source ? createProxyButton(mount, record) : createStructuralItem(record.key);
    proxy.appendChild(element);
    return { element, record };
  });
  mount.overflowToggle = createOverflowToggle();
  proxy.appendChild(mount.overflowToggle);
  parent.insertBefore(proxy, before || null);
  mount.proxyRecords = resolved.records.filter((record) => record.source);
  mount.hiddenRecords = resolved.hidden;
  mount.overflow = createOverflowController(mount, mount.overflowToggle);
  mark(mount, mount.header, 'data-sleekfin-header-proxy-active');
  hideSources(mount);
  window.requestAnimationFrame(() => {
    if (mount.active) {
      updateOverflow(mount);
      syncPopupAnchors(mount);
    }
  });
  return proxy;
}

export function needsProxyReplacement(mount, settings) {
  const resolved = resolveRecords(mount, settings);
  if (Boolean(mount.proxy) !== resolved.customized) return true;
  if (!mount.proxy) return false;
  if (!dom.isConnected(mount.proxy) || resolved.records.length !== mount.proxyEntries.length || resolved.hidden.length !== mount.hiddenRecords.length) return true;
  if (resolved.hidden.some((record, index) => record.source !== mount.hiddenRecords[index].source)) return true;
  return resolved.records.some((record, index) => record.key !== mount.proxyEntries[index].record.key || record.source !== mount.proxyEntries[index].record.source);
}

export function refreshHeaderProxy(mount) {
  if (!mount.proxy) return;

  hideSources(mount);
  mount.proxyRecords.forEach((record) => {
    if (refreshRecordVisual(record)) renderProxyVisual(record);
    record.button.disabled = sourceDisabled(record);
    record.button.style.display = record.nativeHidden ? 'none' : '';
    record.button.setAttribute('data-sleekfin-current', currentSource(record) ? 'true' : 'false');
  });
  syncPopupAnchors(mount);
  scheduleHeaderProxyLayout(mount);
}
