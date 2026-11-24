import { dom } from '../../shared/runtime.js';
import { isNativeMenu } from './inventory.js';
import { createHeaderProxy, needsProxyReplacement, refreshHeaderProxy, scheduleHeaderProxyLayout } from './proxy.js';
import { settingsSignature } from './settings.js';
import { applySettings, cleanup as cleanupShared, createMount, directChildren, layoutMode, mark, setStyle, updateScrolledState } from './shared.js';

function updateActiveControls(mount) {
  const items = mount.header.querySelectorAll('[data-sleekfin-header-segment] button, [data-sleekfin-header-segment] a:not([data-sleekfin-header-brand])');
  items.forEach((item) => {
    mark(mount, item, 'data-sleekfin-header-item', '');
    if (!item.matches('a[href]')) return;
    const href = item.getAttribute('href');
    mark(mount, item, 'data-sleekfin-current', href && window.location.href.includes(href) ? 'true' : 'false');
  });
  mount.header.querySelectorAll('button[id*="-link-"]').forEach((button) => {
    const tab = document.getElementById(button.id.replace('-link-', '-btn-'));
    mark(mount, button, 'data-sleekfin-current', tab?.classList.contains('emby-tab-button-active') ? 'true' : 'false');
  });
}

function findParts(toolbar) {
  const children = directChildren(toolbar);
  const menu = children.find(isNativeMenu) || null;
  const nav = children.find((element) => element.classList.contains('MuiStack-root')) || null;
  const brand =
    nav &&
    Array.from(nav.querySelectorAll('a[href]')).find((link) => {
      const href = link.getAttribute('href') || '';
      return href === '#/' || /#\/$/.test(href);
    });
  const boxes = children.filter((element) => element.classList.contains('MuiBox-root'));
  const profile = boxes.find((box) => Boolean(box.querySelector('button[aria-controls="app-user-menu"]'))) || null;
  const actions = boxes.find((box) => box !== profile && Boolean(box.querySelector('button, a[href]'))) || boxes.find((box) => box !== profile) || null;
  return { actions, brand, menu, nav, profile };
}

function scheduleMeasurement(mount) {
  if (!mount.active || mount.animationFrame) return;

  mount.animationFrame = window.requestAnimationFrame(() => {
    mount.animationFrame = 0;
    if (!mount.active || !dom.isConnected(mount.toolbar)) return;
    if (mount.layoutMode === 'compact') {
      mark(mount, mount.toolbar, 'data-sleekfin-header-measured', 'false');
      return;
    }
    const candidates = mount.clusterItems.filter((element) => dom.isVisible(element) && element.getAttribute('data-sleekfin-header-all-proxied') !== 'true');
    if (!candidates.length) {
      mark(mount, mount.toolbar, 'data-sleekfin-header-measured', 'false');
      return;
    }

    const toolbarRect = mount.toolbar.getBoundingClientRect();
    const firstRect = candidates[0].getBoundingClientRect();
    const lastRect = candidates[candidates.length - 1].getBoundingClientRect();
    const left = firstRect.left - toolbarRect.left;
    const width = lastRect.right - toolbarRect.left - left;
    if (!Number.isFinite(left) || !Number.isFinite(width)) {
      mark(mount, mount.toolbar, 'data-sleekfin-header-measured', 'false');
      return;
    }

    const nextLeft = `${Math.round(left)}px`;
    const nextWidth = `${Math.max(40, Math.round(width))}px`;
    if (mount.lastMeasurement?.left !== nextLeft) {
      mount.toolbar.style.setProperty('--sleekfin-header-pill-left', nextLeft);
    }
    if (mount.lastMeasurement?.width !== nextWidth) {
      mount.toolbar.style.setProperty('--sleekfin-header-pill-width', nextWidth);
    }
    mount.lastMeasurement = { left: nextLeft, width: nextWidth };
    mark(mount, mount.toolbar, 'data-sleekfin-header-measured', 'true');
  });
}

export function createModernAdapter(brand) {
  function mount(header, settings) {
    const toolbar = header.querySelector('.MuiToolbar-root');
    const parts = findParts(toolbar);
    const headerMount = createMount({
      actions: parts.actions,
      brand: parts.brand,
      clusterItems: [],
      header,
      kind: 'modern',
      layoutMode: layoutMode(),
      menu: parts.menu,
      nav: parts.nav,
      navLinkCount: parts.nav ? parts.nav.querySelectorAll('a[href]').length : 0,
      profile: parts.profile,
      settingsSignature: settingsSignature(settings),
      toolbar,
    });

    applySettings(headerMount, settings);
    mark(headerMount, header, 'data-sleekfin-header', 'modern');
    if (parts.brand) {
      brand.useNative(headerMount, parts.brand);
    } else {
      brand.ensureFallback();
    }
    if (parts.nav) {
      mark(headerMount, parts.nav, 'data-sleekfin-header-segment');
      mark(headerMount, parts.nav, 'data-sleekfin-header-nav');
      parts.nav.querySelectorAll('a[href]').forEach((link) => {
        if (link !== parts.brand) {
          mark(headerMount, link, 'data-sleekfin-header-link');
        }
      });
    }
    if (parts.actions) {
      mark(headerMount, parts.actions, 'data-sleekfin-header-segment');
      mark(headerMount, parts.actions, 'data-sleekfin-header-actions');
    }
    if (parts.profile) {
      mark(headerMount, parts.profile, 'data-sleekfin-header-segment');
      mark(headerMount, parts.profile, 'data-sleekfin-header-profile');
    }

    // Jellyfin Enhanced looks for its action host immediately before the native profile box.
    headerMount.proxy = createHeaderProxy(headerMount, toolbar, parts.actions, settings);
    // KefinTweaks applies an ID-specific wrapping rule when its breadcrumbs are mounted.
    if (headerMount.proxy) setStyle(headerMount, toolbar, 'flex-wrap', 'nowrap', 'important');
    headerMount.updateBrandOverlap = () => brand.updateOverlap(headerMount);
    headerMount.clusterItems = headerMount.proxy
      ? [parts.nav, headerMount.proxy, parts.actions, parts.profile].filter(Boolean)
      : directChildren(toolbar).filter((child) => child === parts.actions || child === parts.profile || (child === parts.nav && headerMount.layoutMode === 'desktop'));
    mark(headerMount, headerMount.proxy || headerMount.clusterItems[0], 'data-sleekfin-header-first-cluster');
    mark(headerMount, headerMount.proxy || headerMount.clusterItems[headerMount.clusterItems.length - 1], 'data-sleekfin-header-last-cluster');
    if (typeof window.ResizeObserver === 'function') {
      headerMount.resizeObserver = new window.ResizeObserver(() => {
        scheduleHeaderProxyLayout(headerMount);
        scheduleMeasurement(headerMount);
      });
      headerMount.resizeObserver.observe(toolbar);
      if (headerMount.proxy) {
        headerMount.resizeObserver.observe(headerMount.proxy);
        headerMount.proxyEntries.forEach(({ element }) => headerMount.resizeObserver.observe(element));
      }
    }
    return headerMount;
  }

  function needsReplacement(mount, surface, settings) {
    if (mount.header !== surface.header || !dom.isConnected(mount.toolbar) || !mount.toolbar.hasAttribute('data-sleekfin-header-row')) return true;
    if (mount.layoutMode !== layoutMode()) return true;
    if (mount.settingsSignature !== settingsSignature(settings) || needsProxyReplacement(mount, settings)) return true;

    const parts = findParts(mount.toolbar);
    return (
      mount.actions !== parts.actions ||
      mount.brand !== parts.brand ||
      mount.menu !== parts.menu ||
      mount.nav !== parts.nav ||
      mount.profile !== parts.profile ||
      mount.navLinkCount !== (parts.nav ? parts.nav.querySelectorAll('a[href]').length : 0) ||
      mount.clusterItems.some((element) => !dom.isConnected(element))
    );
  }

  function refresh(mount) {
    updateScrolledState(mount);
    brand.updateOffset(mount);
    updateActiveControls(mount);
    refreshHeaderProxy(mount);
    scheduleMeasurement(mount);
  }

  function cleanup(mount) {
    cleanupShared(mount);
    mount.toolbar.style.removeProperty('--sleekfin-header-pill-left');
    mount.toolbar.style.removeProperty('--sleekfin-header-pill-width');
  }

  return { cleanup, mount, needsReplacement, refresh };
}
