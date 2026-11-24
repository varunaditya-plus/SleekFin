import { dom, h, render } from '../../shared/runtime.js';
import { HeaderOverflowDrawer } from './HeaderOverflowDrawer.jsx';
import { getPopupViewport } from '../../shared/popupPosition.js';
import { HEADER_CONTROL_SELECTOR, JE_LAUNCHER_SELECTOR, KEFIN_HOME_SELECTOR, LABELS, cloneSourceTemplate, currentSource, discoverHeaderControls, legacyAlias, refreshRecordVisual, sourceNativeHidden } from './inventory.js';
import { isTvLayout, mark, setStyle } from './shared.js';

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

  const excluded = new Set(settings.hiddenItems.map((key) => recordForKey(key, discoveries)));
  const placed = new Set();
  const records = [];
  settings.itemOrder.forEach((key) => {
    if (key === 'space' || key === 'separator') {
      records.push({ key, source: null });
      return;
    }

    const record = recordForKey(key, discoveries);
    if (record && !excluded.has(record)) {
      placed.add(record);
      records.push({ ...record, key });
    }
  });

  const hidden = discoveries.filter((record) => record.headerSources?.length && !placed.has(record) && (!record.separate || excluded.has(record)));
  return { customized, hidden, records };
}

function createStructuralItem(key) {
  const item = document.createElement('span');
  item.setAttribute(key === 'space' ? 'data-sleekfin-header-space' : 'data-sleekfin-header-separator', 'true');
  return item;
}

function sourceTitle(record) {
  const title = record.source.getAttribute('title')?.trim() || record.source.getAttribute('aria-label')?.trim() || record.caption;
  return LABELS[title] || title;
}

function sourceDisabled(record) {
  return Boolean(record.source.disabled) || record.source.getAttribute('aria-disabled') === 'true' || record.source.matches('.kefinTweaks-breadcrumb-element') && record.source.style.cursor !== 'pointer';
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
  if (record.key === 'jellyfin:home') {
    window.location.hash = '#/';
    return;
  }
  const route = (window.location.hash || '').toLowerCase();
  const homeRoute = !route || /^#\/home(?:\.html)?(?:[?]|$)/.test(route);
  if (mount.kind === 'legacy' && !homeRoute && record.key.startsWith('sf:')) {
    window.location.hash = `#/home?seerrfinTab=${record.key.slice(3)}`;
    return;
  }
  if (mount.kind === 'legacy' && !homeRoute && record.source.id.startsWith('je-native-tab-btn-')) {
    const index = record.source.getAttribute('data-index');
    if (index) {
      window.location.hash = `#/home?tab=${index}&jeTab=${encodeURIComponent(record.source.id.slice('je-native-tab-btn-'.length))}`;
      return;
    }
  }
  record.source.click();
}

function activateProxy(mount, record, anchor) {
  syncPopupAnchors(mount, record, anchor);
  const activeStreams = record.source.id === 'je-active-streams';
  const kefinMore = record.source.hasAttribute('data-kefin-custom-menu-more');

  // These provider overlays use their own positioning outside Jellyfin's popup system.
  const trigger = activeStreams || kefinMore ? anchor.getBoundingClientRect() : null;
  if (anchor.hasAttribute('data-sleekfin-header-overflow-item')) mount.overflow.close();

  activateSource(mount, record);

  if (trigger) {
    const panel = activeStreams ? document.querySelector('#je-active-streams-panel.je-as-panel-open') : document.querySelector('#user-view-overflow-menu[data-kefin-custom-overflow-menu]:not(.MuiModal-hidden) .MuiPaper-root');
    if (panel) {
      const viewport = getPopupViewport();
      const availableBelow = viewport.bottom - trigger.bottom;
      const availableAbove = trigger.top - viewport.top;
      const above = availableBelow < panel.offsetHeight + 16 && availableAbove > availableBelow;
      setStyle(mount, panel, 'max-height', `${Math.max(0, (above ? availableAbove : availableBelow) - 16)}px`);
      setStyle(mount, panel, 'max-width', `${Math.max(0, viewport.width - 16)}px`);
      const alignedLeft = activeStreams ? trigger.right - panel.offsetWidth : trigger.left;
      const left = Math.max(viewport.left + 8, Math.min(alignedLeft, viewport.right - panel.offsetWidth - 8));
      const frame = panel.offsetParent?.getBoundingClientRect();
      setStyle(mount, panel, 'left', `${left - (frame?.left || 0)}px`);
      setStyle(mount, panel, 'top', above ? 'auto' : `${trigger.bottom + 8 - (frame?.top || 0)}px`);
      setStyle(mount, panel, 'bottom', above ? `${(frame?.bottom || window.innerHeight) - trigger.top + 8}px` : 'auto');
    }
  }
  window.setTimeout(() => {
    if (mount.active) refreshHeaderProxy(mount);
  }, 0);
}

function createProxyButton(mount, record) {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('data-sleekfin-header-item', '');
  button.setAttribute('data-sleekfin-header-proxy-item', record.key);
  record.button = button;
  renderProxyVisual(record);
  button.addEventListener('click', (event) => {
    event.stopPropagation();
    if ((record.key === 'jellyfin:home' || dom.isConnected(record.source)) && !sourceDisabled(record)) {
      activateProxy(mount, record, button);
    }
  });
  return button;
}

function createOverflowToggle() {
  const button = document.createElement('button');
  const caret = document.createElement('span');
  button.type = 'button';
  button.setAttribute('data-sleekfin-header-item', '');
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
    if (isTvLayout() && root.contains(document.activeElement) && dom.isVisible(toggle)) toggle.focus();
    render(null, root);
  }

  function activate(record, anchor) {
    if (!record.source || (record.key !== 'jellyfin:home' && !dom.isConnected(record.source)) || sourceDisabled(record)) return;
    activateProxy(mount, record, anchor);
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
    if (open) close();
    else {
      open = true;
      draw();
    }
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

function proxyContentClipped(mount, viewport, first, last) {
  const { proxy } = mount;
  if (proxy.scrollWidth > proxy.clientWidth + 1) return true;

  const bounds = proxy.getBoundingClientRect();
  let left = Math.max(bounds.left, viewport.left);
  let right = Math.min(bounds.right, viewport.right);
  // The compact dock is fixed to the viewport, outside the toolbar's clipping box.
  for (let parent = mount.layoutMode === 'compact' ? null : proxy.parentElement; parent; parent = parent.parentElement) {
    if (!/^(?:auto|clip|hidden|scroll)$/.test(window.getComputedStyle(parent).overflowX)) continue;
    const rect = parent.getBoundingClientRect();
    const scale = parent.offsetWidth ? rect.width / parent.offsetWidth : 1;
    left = Math.max(left, rect.left + parent.clientLeft * scale);
    right = Math.min(right, rect.left + (parent.clientLeft + parent.clientWidth) * scale);
  }
  return [first, last].some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.left < left - 1 || rect.right > right + 1;
  });
}

function updateOverflow(mount) {
  if (!mount.proxy) return;

  const viewport = getPopupViewport();
  let dockOffset = 0;
  // KefinTweaks uses a bottom rail below 900px and translates it while scrolling.
  if (mount.layoutMode === 'compact' && window.matchMedia?.('(max-width: 899px)').matches) {
    const rail = document.querySelector('#kefin-home-category-rail:not(.hide):not(.is-scroll-hidden) .kefin-home-category-rail');
    if (dom.isVisible(rail) && window.getComputedStyle(rail).position === 'fixed') dockOffset = rail.offsetHeight;
  }
  setStyle(mount, mount.proxy, '--sleekfin-header-dock-offset', `${dockOffset}px`);

  const entries = mount.proxyEntries.filter((entry) => entry.element.style.display !== 'none');
  if (mount.proxy.hidden !== !entries.length) mount.proxy.hidden = !entries.length;
  if (!entries.length) {
    mount.overflow.sync([]);
    mount.updateBrandOverlap?.();
    return;
  }
  const css = window.getComputedStyle(mount.proxy);
  const gap = Number.parseFloat(css.columnGap) || 0;
  if (mount.proxy.scrollLeft) mount.proxy.scrollLeft = 0;
  if (mount.cluster?.scrollLeft) mount.cluster.scrollLeft = 0;

  // Measure all items in one pass before changing their visibility. Iterative flex measurements shrink the fit budget with the bar.
  mount.overflowToggle.setAttribute('data-sleekfin-header-overflow-hidden', 'true');
  entries.forEach(({ element }) => element.setAttribute('data-sleekfin-header-overflowed', 'false'));
  const bounds = mount.proxy.getBoundingClientRect();
  const budget = Math.min(bounds.right, viewport.right) - Math.max(bounds.left, viewport.left) - ['borderLeftWidth', 'borderRightWidth', 'paddingLeft', 'paddingRight'].reduce((total, property) => total + (Number.parseFloat(css[property]) || 0), 0);
  const widths = entries.map(({ element }) => {
    const style = window.getComputedStyle(element);
    return element.getBoundingClientRect().width + (Number.parseFloat(style.marginLeft) || 0) + (Number.parseFloat(style.marginRight) || 0) + gap;
  });

  let used = widths.reduce((sum, width) => sum + width, 0) - gap;
  let count = entries.length;

  if (used > budget + 1 || proxyContentClipped(mount, viewport, entries[0].element, entries[count - 1].element)) {
    mount.overflowToggle.setAttribute('data-sleekfin-header-overflow-hidden', 'false');
    used += mount.overflowToggle.getBoundingClientRect().width + gap;
    while (count && (count === entries.length || used > budget + 1)) {
      used -= widths[--count];
      entries[count].element.setAttribute('data-sleekfin-header-overflowed', 'true');
    }
    // A flex reflow or clipping ancestor can still shorten the visible row after the estimate.
    while (count && proxyContentClipped(mount, viewport, entries[0].element, mount.overflowToggle)) {
      entries[--count].element.setAttribute('data-sleekfin-header-overflowed', 'true');
    }
  }
  
  const overflow = entries.slice(count);
  mount.proxy.setAttribute('data-sleekfin-header-overflow-active', overflow.length ? 'true' : 'false');
  mount.overflow.sync(overflow.map(({ record }) => record));
  mount.updateBrandOverlap?.();
}

export function scheduleHeaderProxyLayout(mount) {
  if (!mount.proxy || !mount.active || mount.proxyFrame) return;
  mount.proxyFrame = window.requestAnimationFrame(() => {
    mount.proxyFrame = 0;
    if (!mount.active || !dom.isConnected(mount.proxy)) return;
    updateOverflow(mount);
    syncPopupAnchors(mount);
  });
}

function markEmptySegments(mount) {
  const markSegment = (segment) => {
    if (!segment) return;
    const controls = Array.from(segment.querySelectorAll(HEADER_CONTROL_SELECTOR)).filter(
      (source) =>
        !source.closest('[data-sleekfin-header-proxy]') &&
        !source.matches(`[data-sleekfin-header-brand], ${JE_LAUNCHER_SELECTOR}, .mainDrawerButton`),
    );
    mark(mount, segment, 'data-sleekfin-header-all-proxied', controls.every((source) => mount.hiddenSources.has(source) || !dom.isVisible(source)) ? 'true' : 'false');
  };
  markSegment(mount.nav);
  markSegment(mount.actions);
  markSegment(mount.profile);
}

function hideProviderWrappers(mount) {
  document.querySelectorAll(`${KEFIN_HOME_SELECTOR}, #kefinTweaks-breadcrumbs-wrapper`).forEach((wrapper) => {
    const controls = Array.from(wrapper.querySelectorAll('.kefin-home-category-btn, .kefin-home-create-section-btn, .kefinTweaks-breadcrumb-element'));
    mark(mount, wrapper, 'data-sleekfin-header-all-proxied', controls.length && controls.every((source) => mount.hiddenSources.has(source)) ? 'true' : 'false');
  });
  mount.header.querySelectorAll('[data-kefin-custom-menu-top-divider]').forEach((divider) => {
    const controls = Array.from(divider.parentElement.querySelectorAll('[data-kefin-custom-menu-top-link], [data-kefin-custom-menu-more]'));
    mark(mount, divider, 'data-sleekfin-header-source-hidden', controls.every((source) => mount.hiddenSources.has(source)) ? 'true' : 'false');
  });
  const randomContainer = mount.header.querySelector('#randomItemButtonContainer');
  if (randomContainer) {
    mark(mount, randomContainer, 'data-sleekfin-header-source-hidden', mount.hiddenSources.has(randomContainer.querySelector('#randomItemButton')) ? 'true' : 'false');
  }

  const enhancedGroup = mount.header.querySelector('#je-native-tabs-group');
  if (enhancedGroup) {
    const hasUnmanagedButton = Array.from(enhancedGroup.querySelectorAll(HEADER_CONTROL_SELECTOR)).some((button) => !mount.hiddenSources.has(button));
    mark(mount, enhancedGroup.querySelector('#je-native-tabs-separator'), 'data-sleekfin-header-source-hidden', hasUnmanagedButton ? 'false' : 'true');
  }

  const enhancedTray = mount.header.querySelector('#je-header-buttons-group');
  if (enhancedTray) {
    const hasUnmanagedButton = Array.from(enhancedTray.querySelectorAll(HEADER_CONTROL_SELECTOR)).some(
      (button) => !button.matches(JE_LAUNCHER_SELECTOR) && !mount.hiddenSources.has(button) && !sourceNativeHidden(button) && !button.parentElement?.closest(HEADER_CONTROL_SELECTOR),
    );
    const hasPopupAnchor = Boolean(enhancedTray.querySelector('[data-sleekfin-header-source-anchor="true"]'));
    mark(mount, enhancedTray, 'data-sleekfin-header-source-hidden', !hasUnmanagedButton && !hasPopupAnchor ? 'true' : 'false');
    mark(mount, enhancedTray, 'data-sleekfin-header-all-proxied', !hasUnmanagedButton ? 'true' : 'false');
    if (!hasUnmanagedButton) document.querySelector('dialog#je-header-launcher-panel[open]')?.close?.();
  }
}

function hideSources(mount) {
  mount.hiddenSources = new Set();
  [...mount.proxyRecords, ...mount.hiddenRecords].forEach((record) => {
    record.headerSources?.forEach((source) => {
      mount.hiddenSources.add(source);
      const category = source.closest('.kefin-home-category-item');
      if (category) mark(mount, category, 'data-sleekfin-header-source-hidden');
      if (source !== record.source) mark(mount, source, 'data-sleekfin-header-source-hidden');
    });
  });
  mount.proxyRecords.forEach((record) => {
    if (record.fallback) return;
    mount.hiddenSources.add(record.source);
    if (record.popup) {
      mark(mount, record.source, 'data-sleekfin-header-source-hidden', 'false');
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
    const cluster = record.source.closest('[data-sleekfin-legacy-cluster]');
    const style = cluster && window.getComputedStyle(cluster);
    // The legacy bar's backdrop filter gives fixed native popup anchors a local coordinate frame.
    const origin = style && ((style.backdropFilter && style.backdropFilter !== 'none') || (style.webkitBackdropFilter && style.webkitBackdropFilter !== 'none')) ? cluster.getBoundingClientRect() : null;
    setStyle(mount, record.source, 'left', `${Math.round(rectangle.left - (origin ? origin.left + cluster.clientLeft : 0))}px`, 'important');
    setStyle(mount, record.source, 'top', `${Math.round(rectangle.top - (origin ? origin.top + cluster.clientTop : 0))}px`, 'important');
    setStyle(mount, record.source, 'height', `${Math.max(1, Math.round(rectangle.height))}px`, 'important');
    setStyle(mount, record.source, 'width', `${Math.max(1, Math.round(rectangle.width))}px`, 'important');
    if (activeRecord && record.source.matches('.kefinTweaks-breadcrumb-element')) {
      const popover = document.getElementById('kefinTweaks-popover-container');
      setStyle(mount, popover, '--sleekfin-header-breadcrumb-top', `${Math.round(rectangle.top)}px`);
      setStyle(mount, popover, '--sleekfin-header-breadcrumb-bottom', `${Math.round(rectangle.bottom)}px`);
    }
  });
}

export function createHeaderProxy(mount, parent, before, settings) {
  const resolved = resolveRecords(mount, settings);
  if (!resolved.customized) return null;

  const proxy = document.createElement('div');
  proxy.setAttribute('data-sleekfin-header-proxy', mount.kind);
  proxy.setAttribute('data-sleekfin-header-bar', '');
  proxy.setAttribute('data-sleekfin-header-item-list', '');
  if (mount.layoutMode === 'compact') proxy.setAttribute('data-sleekfin-header-glass', '');
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
  return proxy;
}

export function needsProxyReplacement(mount, settings) {
  const resolved = resolveRecords(mount, settings);
  if (Boolean(mount.proxy) !== resolved.customized) return true;
  if (!mount.proxy) return false;
  if (!dom.isConnected(mount.proxy) || resolved.records.length !== mount.proxyEntries.length || resolved.hidden.length !== mount.hiddenRecords.length) return true;
  const changedSource = (record, previous) => record.source !== previous.source || record.popup !== previous.popup || record.fallback !== previous.fallback
    || (record.headerSources || []).length !== (previous.headerSources || []).length || record.headerSources?.some((source, index) => source !== previous.headerSources[index]);
  if (resolved.hidden.some((record, index) => changedSource(record, mount.hiddenRecords[index]))) return true;
  return resolved.records.some((record, index) => record.key !== mount.proxyEntries[index].record.key || changedSource(record, mount.proxyEntries[index].record));
}

export function refreshHeaderProxy(mount) {
  if (!mount.proxy) return;

  hideSources(mount);
  mount.proxyRecords.forEach((record) => {
    if (refreshRecordVisual(record)) renderProxyVisual(record);
    record.button.disabled = sourceDisabled(record);
    record.button.style.display = record.nativeHidden ? 'none' : '';
    record.button.title = sourceTitle(record);
    record.button.setAttribute('data-sleekfin-current', currentSource(record) ? 'true' : 'false');
  });
  scheduleHeaderProxyLayout(mount);
}
