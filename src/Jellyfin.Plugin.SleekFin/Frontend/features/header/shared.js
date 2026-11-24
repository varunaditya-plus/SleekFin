import { dom } from '../../shared/runtime.js';

let defaultStyleUrls = [];
try {
  const urls = JSON.parse(document.querySelector('[data-sleekfin-boot]')?.dataset.sleekfinHeaderDefaultAssets || '[]');
  if (Array.isArray(urls)) defaultStyleUrls = urls.filter((url) => typeof url === 'string' && url.startsWith('../SleekFin/'));
} catch {
  console.warn('[SleekFin] The default header stylesheet list could not be read.');
}

export function isTvLayout() {
  return document.documentElement.classList.contains('layout-tv') || Boolean(document.body?.classList.contains('layout-tv'));
}

export function layoutMode() {
  if (isTvLayout()) return 'desktop';
  const compact = typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 899px)').matches : window.innerWidth < 900;
  return compact || document.documentElement.classList.contains('layout-mobile') ? 'compact' : 'desktop';
}

function findVisibleHeader(selector, childSelector) {
  return Array.from(document.querySelectorAll(selector)).find((header) => !header.classList.contains('osdHeader') && dom.isVisible(header) && Boolean(header.querySelector(childSelector))) || null;
}

export function findSurface() {
  const legacy = findVisibleHeader('.skinHeader', '.headerTop');
  if (isTvLayout() && legacy) return { header: legacy, kind: 'legacy' };

  const modern = findVisibleHeader('header.MuiAppBar-root', '.MuiToolbar-root');
  if (modern) return { header: modern, kind: 'modern' };

  return legacy ? { header: legacy, kind: 'legacy' } : null;
}

function ownAttribute(mount, element, name) {
  const existing = mount.ownedAttributes.find((record) => record.element === element && record.name === name);
  if (!existing) {
    mount.ownedAttributes.push({
      element,
      hadValue: element.hasAttribute(name),
      name,
      value: element.getAttribute(name),
    });
  }
}

function ownStyle(mount, element, name) {
  const existing = mount.ownedStyles.find((record) => record.element === element && record.name === name);
  if (!existing) {
    mount.ownedStyles.push({
      element,
      name,
      priority: element.style.getPropertyPriority(name),
      value: element.style.getPropertyValue(name),
    });
  }
}

export function mark(mount, element, name, value) {
  if (!element) return;

  ownAttribute(mount, element, name);
  const nextValue = value === undefined ? 'true' : value;
  if (element.getAttribute(name) !== nextValue) {
    element.setAttribute(name, nextValue);
  }
}

export function setStyle(mount, element, name, value, priority) {
  if (!element) return;

  ownStyle(mount, element, name);
  const nextPriority = priority || '';
  if (element.style.getPropertyValue(name) !== value || element.style.getPropertyPriority(name) !== nextPriority) {
    element.style.setProperty(name, value, nextPriority);
  }
}

export function applySettings(mount, settings) {
  const root = document.documentElement;
  mount.styles = settings.styles
    ? settings.styles.filter(Boolean).map((css) => {
      const style = document.createElement('style');
      style.textContent = css;
      return document.head.appendChild(style);
    })
    : defaultStyleUrls.map((url) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      return document.head.appendChild(link);
    });
  mark(mount, root, 'data-sleekfin-header-bar-position', settings.barPosition.toLowerCase());
  mark(mount, root, 'data-sleekfin-header-brand-display', settings.brandDisplay.toLowerCase());
  mark(mount, root, 'data-sleekfin-header-brand-position', settings.brandPosition.toLowerCase());
  mark(mount, root, 'data-sleekfin-header-layout', mount.layoutMode);
  mark(mount, mount.header, 'data-sleekfin-header-surface', '');
  mark(mount, mount.toolbar, 'data-sleekfin-header-row', 'live');
}

// These dimensions also position elements outside the header, including the detail page and mobile dock.
export function measureHeaderStyles(row, brand, bar, write) {
  const rowStyle = row && window.getComputedStyle(row);
  const brandStyle = brand && window.getComputedStyle(brand);
  const barStyle = bar && window.getComputedStyle(bar);
  const item = bar?.querySelector('[data-sleekfin-header-overflow-toggle], .sleekfin-builder-preview-overflow-toggle') ||
    bar?.querySelector('[data-sleekfin-header-item]');
  [
    [rowStyle?.height, 'height', 80],
    [brandStyle?.height, 'logo-height', 36],
    [brandStyle?.columnGap, 'brand-gap', 10],
    [barStyle?.columnGap, 'item-spacing', 2],
    [barStyle?.paddingTop, 'bar-padding', 4],
    [item && window.getComputedStyle(item).height, 'item-height', 32],
  ].forEach(([size, name, fallback]) => {
    const value = /^-?\d*\.?\d+px$/.test(size) ? Number.parseFloat(size) : fallback;
    write(`--sleekfin-header-measured-${name}`, `${Math.round(value * 16) / 16}px`);
  });
}

export function directChildren(element) {
  return element ? Array.from(element.children) : [];
}

function rememberMove(mount, element) {
  mount.movedNodes.push({
    element,
    nextSibling: element.nextSibling,
    parent: element.parentNode,
  });
}

export function move(mount, element, destination) {
  if (!element || !destination || element.parentNode === destination) return;

  rememberMove(mount, element);
  destination.appendChild(element);
}

export function updateScrolledState(mount) {
  // Jellyfin detail pages scroll their page element instead of the window.
  const offset = Math.max(window.scrollY, ...Array.from(document.querySelectorAll('.page:not(.hide)'), (page) => page.scrollTop));
  mark(mount, mount.header, 'data-sleekfin-scrolled', offset > 20 ? 'true' : 'false');
}

function restoreOwnedAttributes(mount) {
  mount.ownedAttributes
    .slice()
    .reverse()
    .forEach((record) => {
      if (record.hadValue) {
        record.element.setAttribute(record.name, record.value);
      } else {
        record.element.removeAttribute(record.name);
      }
    });
}

function restoreMovedNodes(mount) {
  for (let index = mount.movedNodes.length - 1; index >= 0; index -= 1) {
    const record = mount.movedNodes[index];
    if (!dom.isConnected(record.element) || !dom.isConnected(record.parent)) {
      continue;
    }

    const nextSibling = record.nextSibling?.parentNode === record.parent ? record.nextSibling : null;
    record.parent.insertBefore(record.element, nextSibling);
  }
}

function restoreOwnedStyles(mount) {
  mount.ownedStyles
    .slice()
    .reverse()
    .forEach((record) => {
      if (record.value) {
        record.element.style.setProperty(record.name, record.value, record.priority);
      } else {
        record.element.style.removeProperty(record.name);
      }
    });
}

export function cleanup(mount) {
  if (!mount) return;

  mount.active = false;
  if (mount.animationFrame) {
    window.cancelAnimationFrame(mount.animationFrame);
    mount.animationFrame = 0;
  }
  if (mount.proxyFrame) {
    window.cancelAnimationFrame(mount.proxyFrame);
    mount.proxyFrame = 0;
  }
  mount.resizeObserver?.disconnect();
  mount.overflow?.destroy();
  mount.styles?.forEach((style) => style.remove());
  restoreOwnedAttributes(mount);
  restoreOwnedStyles(mount);
  restoreMovedNodes(mount);
  mount.proxy?.remove();
  mount.cluster?.remove();
}

export function createMount(values) {
  return {
    active: true,
    animationFrame: 0,
    proxyFrame: 0,
    movedNodes: [],
    ownedAttributes: [],
    ownedStyles: [],
    ...values,
  };
}
