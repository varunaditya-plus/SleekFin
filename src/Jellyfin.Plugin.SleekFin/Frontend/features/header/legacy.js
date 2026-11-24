import { dom } from '../../shared/runtime.js';
import { createHeaderProxy, needsProxyReplacement, refreshHeaderProxy, scheduleHeaderProxyLayout } from './proxy.js';
import { settingsSignature } from './settings.js';
import { applySettings, cleanup, createMount, directChildren, isTvLayout, layoutMode, mark, move, updateScrolledState } from './shared.js';

export function createLegacyAdapter(brand) {
  function mount(header, settings) {
    const top = header.querySelector('.headerTop');
    const left = header.querySelector('.headerLeft');
    const right = header.querySelector('.headerRight');
    const tabs = header.querySelector('.headerTabs');
    const menu = left?.querySelector('.mainDrawerButton') || null;
    const cluster = dom.element('<div data-sleekfin-legacy-cluster="true" data-sleekfin-header-bar></div>');
    const mode = layoutMode();
    if (mode !== 'compact') cluster.setAttribute('data-sleekfin-header-glass', '');
    const headerMount = createMount({
      actions: right,
      cluster,
      header,
      isTv: isTvLayout(),
      kind: 'legacy',
      layoutMode: mode,
      menu,
      nav: tabs,
      settingsSignature: settingsSignature(settings),
      toolbar: top,
    });

    top.appendChild(cluster);
    applySettings(headerMount, settings);
    mark(headerMount, header, 'data-sleekfin-header', 'legacy');
    mark(headerMount, top, 'data-sleekfin-legacy-top');
    mark(headerMount, left, 'data-sleekfin-legacy-left');
    if (left) {
      directChildren(left)
        .filter((element) => element !== menu && element.matches('button, .headerButton, .paper-icon-button-light'))
        .forEach((element) => move(headerMount, element, cluster));
    }
    move(headerMount, right, cluster);
    cluster.querySelectorAll('button.headerButton, button.paper-icon-button-light')
      .forEach((item) => mark(headerMount, item, 'data-sleekfin-header-item', ''));
    brand.ensureFallback(headerMount.isTv ? header : document.body);
    headerMount.proxy = createHeaderProxy(headerMount, cluster, right, settings);
    headerMount.updateBrandOverlap = () => brand.updateOverlap(headerMount);
    if (typeof window.ResizeObserver === 'function') {
      headerMount.resizeObserver = new window.ResizeObserver(() => scheduleHeaderProxyLayout(headerMount));
      headerMount.resizeObserver.observe(top);
      if (headerMount.proxy) {
        headerMount.resizeObserver.observe(headerMount.proxy);
        headerMount.proxyEntries.forEach(({ element }) => headerMount.resizeObserver.observe(element));
      }
    }
    return headerMount;
  }

  function needsReplacement(mount, surface, settings) {
    return (
      mount.header !== surface.header ||
      mount.isTv !== isTvLayout() ||
      mount.layoutMode !== layoutMode() ||
      !dom.isConnected(mount.cluster) ||
      mount.toolbar !== surface.header.querySelector('.headerTop') ||
      mount.nav !== surface.header.querySelector('.headerTabs') ||
      mount.actions !== surface.header.querySelector('.headerRight') ||
      mount.menu !== surface.header.querySelector('.mainDrawerButton') ||
      mount.settingsSignature !== settingsSignature(settings) ||
      needsProxyReplacement(mount, settings)
    );
  }

  function refresh(mount) {
    updateScrolledState(mount);
    brand.updateOffset(mount);
    refreshHeaderProxy(mount);
  }

  return { cleanup, mount, needsReplacement, refresh };
}
