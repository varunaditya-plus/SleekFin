import { dom } from '../../shared/runtime.js';
import { createBrandController } from './FallbackBrand.jsx';
import { appRoute, catalogDescriptors, catalogSignature, chromeSignature, cloneCatalogTemplate, cloneChromeTemplate, discoverHeaderChrome, discoverHeaderControls, isDashboardRoute } from './inventory.js';
import { createLegacyAdapter } from './legacy.js';
import { createModernAdapter } from './modern.js';
import { DEFAULT_SETTINGS, normalizeSettings, settingsSignature } from './settings.js';
import { findSurface, layoutMode } from './shared.js';

const ROOT_BOOT_LOADING_CLASS = 'sleekfin-header-boot-loading';
const ROOT_CLASS = 'sleekfin-header-mounted';
const ROOT_LOADING_CLASS = 'sleekfin-header-loading';
const SOURCE_CACHE_KEY = 'sleekfin:header-sources:v2';
const SETTINGS_CHANGED_EVENT = 'sleekfin:header-settings-changed';
const WINDOW_EVENTS = ['hashchange', 'pageshow', 'popstate', 'resize'];
const PUBLIC_PATHS = new Set(['/addserver', '/selectserver', '/login', '/forgotpassword', '/forgotpasswordpin', '/wizardremoteaccess', '/wizardfinish', '/wizardlibrary', '/wizardsettings', '/wizardstart', '/wizarduser']);
const DISABLED_SETTINGS = Object.freeze({ ...DEFAULT_SETTINGS, enabled: false });
const PUBLIC_SETTINGS = Object.freeze(normalizeSettings({
  enabled: document.documentElement.dataset.sleekfinHeaderEnabled === 'true',
  height: Number.parseFloat(document.documentElement.style.getPropertyValue('--sleekfin-header-height')) || DEFAULT_SETTINGS.height,
}));

function sourceTemplate(html) {
  const holder = document.createElement('template');
  holder.innerHTML = typeof html === 'string' ? html : '';
  const template = holder.content.firstElementChild;
  return template?.matches('[data-sleekfin-header-source-visual]') ? template : null;
}

function currentScope() {
  try {
    const apiClient = window.ApiClient;
    const serverId = apiClient?.serverId?.() || apiClient?.serverInfo?.()?.Id || '';
    const route = (window.location.hash.slice(1) || window.location.pathname).split('?')[0].toLowerCase();
    const userId = PUBLIC_PATHS.has(route) || route === '/wizard' || route.startsWith('/wizard/') ? '' : apiClient?.getCurrentUserId?.() || '';
    return { key: serverId && userId ? `${serverId}:${userId}` : '', serverId, userId };
  } catch {
    return { key: '', serverId: '', userId: '' };
  }
}

function isExcludedRoute() {
  return isDashboardRoute() || appRoute() === '/video';
}

function cachedHeaderSources(scope = currentScope()) {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(SOURCE_CACHE_KEY) || 'null');
    if (!scope.userId || stored?.serverId !== scope.serverId || stored?.userId !== scope.userId) return { catalog: [], chrome: {}, scopeKey: scope.key };

    const catalog = (Array.isArray(stored.catalog) ? stored.catalog : [])
      .slice(0, 128)
      .map((record) => ({ ...record, key: String(record.key || ''), template: sourceTemplate(record.template) }))
      .filter((record) => record.key && record.template);
    const chrome = {};
    ['brand', 'menu'].forEach((part) => {
      const record = stored.chrome?.[part];
      const template = sourceTemplate(record?.template);
      if (template) chrome[part] = { kind: record.kind || '', label: record.label || '', template };
    });
    if (layoutMode() === 'desktop' && chrome.menu?.kind === 'modern') delete chrome.menu;
    return { catalog, chrome, scopeKey: scope.key };
  } catch {
    return { catalog: [], chrome: {}, scopeKey: scope.key };
  }
}

function cacheHeaderSources(catalog, chrome) {
  try {
    const scope = currentScope();
    if (!scope.userId) return '';

    window.sessionStorage.setItem(
      SOURCE_CACHE_KEY,
      JSON.stringify({
        catalog: catalog.map((record) => ({
          caption: record.caption,
          current: record.current,
          inline: record.inline,
          key: record.key,
          label: record.label,
          nativeHidden: record.nativeHidden,
          template: record.template.outerHTML,
        })),
        chrome: Object.fromEntries(
          ['brand', 'menu']
            .filter((part) => chrome[part])
            .map((part) => [part, { kind: chrome[part].kind, label: chrome[part].label, template: chrome[part].template.outerHTML }]),
        ),
        serverId: scope.serverId,
        userId: scope.userId,
      }),
    );
    return scope.key;
  } catch {
    return '';
  }
}

function createHeaderFeature() {
  const cached = cachedHeaderSources();
  const state = {
    catalog: cached.catalog,
    catalogSignature: catalogSignature(cached.catalog),
    chrome: cached.chrome,
    chromeSignature: chromeSignature(cached.chrome),
    loadingTimer: 0,
    mount: null,
    publicSettings: PUBLIC_SETTINGS,
    reconcileTimer: 0,
    settings: PUBLIC_SETTINGS,
    settingsResolved: false,
    settingsRequest: 0,
    settingsRetryDelay: 1000,
    settingsRetryTimer: 0,
    settingsScope: '',
    sourceCacheScope: cached.scopeKey,
    started: false,
    stopWatching: null,
  };
  const brand = createBrandController(() => state.started);
  const adapters = { legacy: createLegacyAdapter(brand), modern: createModernAdapter(brand) };

  function finishLoading() {
    window.clearTimeout(state.loadingTimer);
    state.loadingTimer = 0;
    document.documentElement.classList.remove(ROOT_BOOT_LOADING_CLASS, ROOT_LOADING_CLASS);
  }

  function prepareLoading() {
    if (state.loadingTimer && document.documentElement.classList.contains(ROOT_LOADING_CLASS)) return;
    finishLoading();
    document.documentElement.classList.add(ROOT_LOADING_CLASS);
    state.loadingTimer = window.setTimeout(finishLoading, 4000);
  }

  function notifyCatalogChanged() {
    if (typeof window.CustomEvent === 'function') window.dispatchEvent(new CustomEvent('sleekfin:header-catalog-changed'));
  }

  function clearStaleDashboardMenu() {
    if (!isDashboardRoute() || layoutMode() === 'compact' || state.chrome.menu?.kind !== 'modern') return;

    const nextChrome = { ...state.chrome };
    delete nextChrome.menu;
    state.chrome = nextChrome;
    state.chromeSignature = chromeSignature(nextChrome);
    const cacheScope = cacheHeaderSources(state.catalog, state.chrome);
    if (cacheScope) state.sourceCacheScope = cacheScope;
    notifyCatalogChanged();
  }

  function hydrateHeaderSourceCache() {
    const scope = currentScope();
    if (!scope.key || scope.key === state.sourceCacheScope) return;

    const restored = cachedHeaderSources(scope);
    const nextCatalog = restored.catalog;
    const nextChrome = restored.chrome;
    const nextCatalogSignature = catalogSignature(nextCatalog);
    const nextChromeSignature = chromeSignature(nextChrome);
    const changed = nextCatalogSignature !== state.catalogSignature || nextChromeSignature !== state.chromeSignature;
    state.catalog = nextCatalog;
    state.catalogSignature = nextCatalogSignature;
    state.chrome = nextChrome;
    state.chromeSignature = nextChromeSignature;
    state.sourceCacheScope = scope.key;
    cacheHeaderSources(state.catalog, state.chrome);
    if (changed) notifyCatalogChanged();
  }

  function syncServerScope() {
    const scope = currentScope();
    if (!scope.key) {
      if (!state.settingsScope) return false;

      state.settingsScope = '';
      state.settingsRequest += 1;
      window.clearTimeout(state.settingsRetryTimer);
      state.settingsRetryTimer = 0;
      state.catalog = [];
      state.catalogSignature = catalogSignature([]);
      state.chrome = {};
      state.chromeSignature = chromeSignature({});
      state.sourceCacheScope = '';
      try {
        window.sessionStorage.removeItem(SOURCE_CACHE_KEY);
      } catch {}
      brand.resetServer();
      unmount();
      notifyCatalogChanged();
      return true;
    }

    hydrateHeaderSourceCache();
    if (scope.key === state.settingsScope) return false;

    state.settingsScope = scope.key;
    state.settingsResolved = false;
    state.settingsRequest += 1;
    state.settingsRetryDelay = 1000;
    window.clearTimeout(state.settingsRetryTimer);
    state.settingsRetryTimer = 0;
    state.settings = DISABLED_SETTINGS;
    brand.resetServer();
    unmount();
    return true;
  }

  function captureHeaderSources(surface) {
    if (!surface || !currentScope().userId) return;

    const records = discoverHeaderControls(surface);
    const signature = catalogSignature(records);
    let changed = false;
    if (records.length && signature !== state.catalogSignature) {
      state.catalog = records.map((record) => ({
        caption: record.caption,
        current: record.current,
        inline: record.inline,
        key: record.key,
        label: record.label,
        nativeHidden: record.nativeHidden,
        template: record.template.cloneNode(true),
      }));
      state.catalogSignature = signature;
      changed = true;
    }

    const discoveredChrome = discoverHeaderChrome(surface);
    const nextChrome = { ...state.chrome };
    ['brand', 'menu'].forEach((part) => {
      const record = discoveredChrome[part];
      if (!record) {
        if (part === 'menu' && surface.kind === 'modern' && layoutMode() === 'desktop') delete nextChrome.menu;
        return;
      }
      nextChrome[part] = { ...record, template: record.template.cloneNode(true) };
    });
    const nextChromeSignature = chromeSignature(nextChrome);
    if (nextChromeSignature !== state.chromeSignature) {
      state.chrome = nextChrome;
      state.chromeSignature = nextChromeSignature;
      changed = true;
    }

    if (changed) {
      const cacheScope = cacheHeaderSources(state.catalog, state.chrome);
      if (cacheScope) state.sourceCacheScope = cacheScope;
      notifyCatalogChanged();
    }
  }

  function cleanupMount() {
    if (!state.mount) return;

    adapters[state.mount.kind].cleanup(state.mount);
    state.mount = null;
  }

  function unmount() {
    cleanupMount();
    brand.removeFallback();
    document.documentElement.classList.remove(ROOT_CLASS);
  }

  function reconcile() {
    if (!state.started) return;
    if (syncServerScope()) requestSettings();
    if (isExcludedRoute()) {
      unmount();
      finishLoading();
      return;
    }
    const surface = findSurface();
    captureHeaderSources(surface);
    if (!state.settings.enabled) {
      unmount();
      if (state.settingsResolved) finishLoading();
      return;
    }

    if (!surface) {
      unmount();
      prepareLoading();
      return;
    }

    const adapter = adapters[surface.kind];
    if (!state.mount || state.mount.kind !== surface.kind || adapter.needsReplacement(state.mount, surface, state.settings)) {
      cleanupMount();
      brand.removeFallback();
      state.mount = adapter.mount(surface.header, state.settings);
      document.documentElement.classList.add(ROOT_CLASS);
      finishLoading();
    }
    adapter.refresh(state.mount);
    captureHeaderSources(surface);
  }

  function scheduleReconcile() {
    if (!state.started) return;
    if (state.reconcileTimer) return;

    state.reconcileTimer = window.setTimeout(() => {
      state.reconcileTimer = 0;
      reconcile();
    }, 40);
  }

  function scheduleSettingsRetry() {
    window.clearTimeout(state.settingsRetryTimer);
    state.settingsRetryTimer = window.setTimeout(requestSettings, state.settingsRetryDelay);
    state.settingsRetryDelay = Math.min(30000, state.settingsRetryDelay * 2);
  }

  function requestSettings() {
    if (!state.started) return;

    const scope = currentScope();
    if (!scope.userId) {
      syncServerScope();
      state.settingsResolved = true;
      state.settings = state.publicSettings;
      scheduleReconcile();
      return;
    }

    const apiClient = window.ApiClient;
    if (!apiClient || typeof apiClient.ajax !== 'function' || typeof apiClient.getUrl !== 'function') {
      window.clearTimeout(state.settingsRetryTimer);
      state.settingsRetryTimer = window.setTimeout(requestSettings, 200);
      return;
    }

    syncServerScope();
    window.clearTimeout(state.settingsRetryTimer);
    state.settingsRetryTimer = 0;
    const requestScope = scope.key;
    const request = ++state.settingsRequest;
    apiClient
      .ajax({ dataType: 'json', type: 'GET', url: apiClient.getUrl('SleekFin/Header') })
      .then((settings) => {
        if (!state.started || request !== state.settingsRequest || requestScope !== currentScope().key) return;

        hydrateHeaderSourceCache();
        const normalized = normalizeSettings(settings);
        state.publicSettings = normalizeSettings({ enabled: normalized.enabled, height: normalized.height });
        state.settingsResolved = true;
        state.settingsRetryDelay = 1000;
        if (settingsSignature(normalized) !== settingsSignature(state.settings)) {
          state.settings = normalized;
          scheduleReconcile();
        }
      })
      .catch(() => {
        if (!state.started || request !== state.settingsRequest || requestScope !== currentScope().key) return;

        if (!state.settingsResolved) state.settings = DISABLED_SETTINGS;
        finishLoading();
        scheduleReconcile();
        scheduleSettingsRetry();
      });
  }

  function watchHeader(event) {
    const scopeChanged = syncServerScope();
    clearStaleDashboardMenu();
    if (isExcludedRoute()) {
      unmount();
      finishLoading();
    } else if (event?.type !== 'scroll') captureHeaderSources(findSurface());
    scheduleReconcile();
    if (scopeChanged || (!state.settingsResolved && (event?.type === 'pageshow' || event?.type === 'viewshow'))) requestSettings();
  }

  // Scroll does not bubble, so capture it to also see pages that scroll inside their own element.
  function onScroll(event) {
    if (event.target === document || event.target.classList.contains('page')) watchHeader(event);
  }

  function start() {
    if (state.started || !document.body) return;

    state.started = true;
    window.addEventListener(SETTINGS_CHANGED_EVENT, requestSettings);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    state.stopWatching = dom.watchSpa(watchHeader, {
      events: WINDOW_EVENTS,
      viewshow: true,
    });
    requestSettings();
    reconcile();
  }

  function stop() {
    state.started = false;
    if (state.reconcileTimer) {
      window.clearTimeout(state.reconcileTimer);
      state.reconcileTimer = 0;
    }
    window.clearTimeout(state.settingsRetryTimer);
    state.settingsRetryTimer = 0;
    state.settingsRequest += 1;
    window.removeEventListener(SETTINGS_CHANGED_EVENT, requestSettings);
    document.removeEventListener('scroll', onScroll, true);
    state.stopWatching?.();
    state.stopWatching = null;
    unmount();
    finishLoading();
  }

  function getCatalog() {
    return catalogDescriptors(state.catalog);
  }

  function cloneCatalogItem(key) {
    return cloneCatalogTemplate(state.catalog, key);
  }

  function cloneChromePart(part) {
    return cloneChromeTemplate(state.chrome, part);
  }

  return { cloneCatalogItem, cloneChromePart, getCatalog, start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.header?.stop?.();
features.header = createHeaderFeature();
features.header.start();
