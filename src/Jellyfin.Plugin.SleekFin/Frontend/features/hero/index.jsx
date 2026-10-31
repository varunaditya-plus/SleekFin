import { dom, h, render } from '../../shared/runtime.js';
import { Hero } from './Hero.jsx';
import { applySettings } from './settings.js';
import { loadEntries, loadSettings } from './source.js';

const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const SETTINGS_EVENT = 'sleekfin:hero-settings-changed';
const ROOT_BOOT_LOADING_CLASS = 'sleekfin-hero-boot-loading';
const ROOT_LOADING_CLASS = 'sleekfin-hero-loading';
const ROOT_MOUNTED_CLASS = 'sleekfin-hero-mounted';
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.hero?.stop?.();

const state = {
  enabled: document.documentElement.dataset.sleekfinHeroEnabled === 'true',
  failedHost: null,
  generation: 0,
  loadingTimer: 0,
  mount: null,
  readyFrame: 0,
  reconcileTimer: 0,
  started: false,
  stopWatching: null,
};

function finishLoading() {
  window.clearTimeout(state.loadingTimer);
  state.loadingTimer = 0;
  document.documentElement.classList.remove(ROOT_BOOT_LOADING_CLASS, ROOT_LOADING_CLASS);
}

function prepareLoading() {
  const root = document.documentElement;
  if (root.classList.contains(ROOT_BOOT_LOADING_CLASS) || (state.loadingTimer && root.classList.contains(ROOT_LOADING_CLASS))) return;
  root.classList.add(ROOT_LOADING_CLASS);
  state.loadingTimer = window.setTimeout(finishLoading, 4000);
}

function isHomeRoute() {
  const match = window.location.hash.match(/^#\/(?:home)?(?:\?([^#]*))?$/);
  if (!match) return false;

  const query = new URLSearchParams(match[1] || '');
  const tab = query.get('tab');
  return !query.get('seerrfinTab') && (!tab || tab === '0');
}

function findHost() {
  if (!isHomeRoute()) return null;
  return Array.from(document.querySelectorAll('#indexPage #homeTab.is-active .sections')).find(dom.isVisible) || null;
}

function removeMount() {
  if (!state.mount) return;
  window.cancelAnimationFrame(state.readyFrame);
  state.readyFrame = 0;
  render(null, state.mount);
  state.mount.remove();
  state.mount = null;
  document.documentElement.classList.remove(ROOT_MOUNTED_CLASS);
}

function unmount() {
  state.generation += 1;
  state.failedHost = null;
  removeMount();
}

function createRoot(host) {
  // Jellyfin's customized items container is upgraded only when its `is` attribute is parsed.
  const root = dom.element('<div is="emby-itemscontainer" class="sleekfin-hero itemsContainer" data-contextmenu="false" data-multiselect="false" data-state="loading"></div>');
  host.parentNode.insertBefore(root, host);
  state.mount = root;
  document.documentElement.classList.add(ROOT_MOUNTED_CLASS);
  finishLoading();
  if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
    window.CustomElements.upgradeSubtree(root);
  }
  return root;
}

function renderHero(root, entries, settings) {
  if (state.mount !== root || !dom.isConnected(root) || !isHomeRoute()) return;

  render(h(Hero, { entries, root, settings }), root);
  state.readyFrame = window.requestAnimationFrame(() => {
    state.readyFrame = 0;
    if (state.mount === root && dom.isConnected(root)) root.dataset.state = 'ready';
  });
}

function mount(host) {
  const client = window.ApiClient;
  const generation = ++state.generation;
  const root = createRoot(host);
  loadSettings(client)
    .then((settings) => {
      if (generation !== state.generation || state.mount !== root || !dom.isConnected(root)) return null;
      state.enabled = settings.enabled;
      if (!settings.enabled) {
        removeMount();
        return null;
      }
      applySettings(root, settings);
      return loadEntries(client, settings).then((entries) => ({ entries, settings }));
    })
    .then((result) => {
      if (!result || generation !== state.generation) return;
      if (result.entries.length) {
        renderHero(root, result.entries, result.settings);
      } else {
        state.failedHost = host;
        removeMount();
      }
    })
    .catch(() => {
      if (generation === state.generation) {
        state.failedHost = host;
        removeMount();
      }
    });
}

function reconcile() {
  if (!state.started || !window.ApiClient) return;

  const host = findHost();
  if (!host) {
    document.documentElement.classList.remove(ROOT_MOUNTED_CLASS);
    // Jellyfin 12 restores the exact focused node from its cached Home page.
    if (document.documentElement.classList.contains('layout-tv') && state.mount?.dataset.state === 'ready'
      && dom.isConnected(state.mount.closest('#indexPage[data-dom-cache="true"]'))
      && (isHomeRoute() || /^#\/details(?:[?&]|$)/.test(window.location.hash))) return;
    unmount();
    return;
  }
  if (state.enabled === false) {
    finishLoading();
    removeMount();
    return;
  }
  if (state.mount && dom.isConnected(state.mount) && state.mount.nextElementSibling === host) {
    document.documentElement.classList.add(ROOT_MOUNTED_CLASS);
    return;
  }
  if (state.failedHost === host) return;

  unmount();
  mount(host);
}

function scheduleReconcile() {
  const home = isHomeRoute();
  const loading = home && state.enabled !== false && !dom.isConnected(state.mount) && (!state.failedHost || state.failedHost !== findHost());
  if (!loading) finishLoading();
  else prepareLoading();
  if (state.reconcileTimer) return;
  state.reconcileTimer = window.setTimeout(() => {
    state.reconcileTimer = 0;
    reconcile();
  }, 0);
}

function reloadSettings() {
  if (!state.started) return;
  state.enabled = null;
  unmount();
  scheduleReconcile();
}

function start() {
  if (state.started) return;

  state.started = true;
  state.stopWatching = dom.watchSpa(scheduleReconcile, {
    events: WINDOW_EVENTS,
    viewshow: true,
  });
  window.addEventListener(SETTINGS_EVENT, reloadSettings);
  scheduleReconcile();
}

function stop() {
  state.started = false;
  window.clearTimeout(state.reconcileTimer);
  state.reconcileTimer = 0;
  state.stopWatching?.();
  state.stopWatching = null;
  window.removeEventListener(SETTINGS_EVENT, reloadSettings);
  unmount();
  finishLoading();
}

features.hero = { start, stop };

start();
