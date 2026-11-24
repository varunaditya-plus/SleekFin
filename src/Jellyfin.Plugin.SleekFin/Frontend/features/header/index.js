import { dom } from '../../shared/runtime.js';
import { createBrandController } from './FallbackBrand.jsx';
import { HEADER_SOURCE_ROOT_SELECTOR, KEFIN_HOME_SELECTOR, KEFIN_SOURCE_SELECTOR, appRoute, catalogDescriptors, catalogSignature, chromeSignature, cloneCatalogTemplate, cloneChromeTemplate, discoverHeaderChrome, discoverHeaderControls, isDashboardRoute, setHeaderUserViews } from './inventory.js';
import { createLegacyAdapter } from './legacy.js';
import { createModernAdapter } from './modern.js';
import { DEFAULT_SETTINGS, isItemId, normalizeSettings } from './settings.js';
import { findSurface, layoutMode, measureHeaderStyles, setStyle } from './shared.js';

const ROOT_BOOT_LOADING_CLASS = 'sleekfin-header-boot-loading';
const ROOT_CLASSES = ['sleekfin-header-mounted', 'sleekfin-header-theme'];
const ROOT_LOADING_CLASS = 'sleekfin-header-loading';
const SOURCE_CACHE_KEY = 'sleekfin:header-sources:v2';
const VISUAL_CACHE_KEY = 'sleekfin:header-visuals:v1';
const PORTABLE_ICON_TAGS = new Set(['span', 'svg', 'g', 'path', 'circle', 'ellipse', 'line', 'rect', 'polygon', 'polyline', 'defs', 'clippath', 'mask', 'lineargradient', 'radialgradient', 'stop', 'title', 'desc', 'use']);
const HEADER_SOURCE_SELECTOR = `${HEADER_SOURCE_ROOT_SELECTOR}, ${KEFIN_HOME_SELECTOR}, ${KEFIN_SOURCE_SELECTOR}`;
const MAX_CATALOG_ITEMS = 256;
const SETTINGS_CHANGED_EVENT = 'sleekfin:header-settings-changed';
const WINDOW_EVENTS = ['hashchange', 'pageshow', 'popstate', 'resize'];
const PUBLIC_PATHS = new Set(['/addserver', '/selectserver', '/login', '/forgotpassword', '/forgotpasswordpin', '/wizardremoteaccess', '/wizardfinish', '/wizardlibrary', '/wizardsettings', '/wizardstart', '/wizarduser']);
const DISABLED_SETTINGS = Object.freeze({ ...DEFAULT_SETTINGS, enabled: false });
const PUBLIC_SETTINGS = Object.freeze(normalizeSettings({
  enabled: document.documentElement.dataset.sleekfinHeaderEnabled === 'true',
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

function portableIcon(template) {
  // Keep vector and font icons across tabs without persisting image or stylesheet URLs.
  return template.matches('[data-sleekfin-header-source-visual]:not([data-sleekfin-header-source-visual="text-only"])') &&
    [template, ...template.querySelectorAll('*')].every((element) => PORTABLE_ICON_TAGS.has(element.localName.toLowerCase()) &&
      Array.from(element.attributes).every(({ name, value }) => !/^(?:on|src|data-.*(?:url|token|key)$)/i.test(name) &&
        !/(?:url\s*\(|\\)/i.test(value) && (!/^(?:xlink:)?href$/i.test(name) || value.startsWith('#'))));
}

function readSourceCache(storage, key, scope) {
  try {
    const stored = JSON.parse(window[storage].getItem(key) || 'null');
    return stored?.serverId === scope.serverId && stored.userId === scope.userId ? stored : null;
  } catch {
    return null;
  }
}

function cachedHeaderSources(scope = currentScope()) {
  const catalog = new Map();
  const chrome = {};
  if (scope.key) {
    const stored = readSourceCache('sessionStorage', SOURCE_CACHE_KEY, scope);
    const visuals = readSourceCache('localStorage', VISUAL_CACHE_KEY, scope);
    [
      [stored?.catalog, false],
      [visuals?.catalog, true],
    ].forEach(([records, portable]) => {
      if (!Array.isArray(records)) return;
      records.slice(0, MAX_CATALOG_ITEMS).forEach((record) => {
        const key = String(record?.key || '');
        if (!isItemId(key) || catalog.has(key) || catalog.size >= MAX_CATALOG_ITEMS) return;

        const template = sourceTemplate(record.template);
        if (!template || portable && !portableIcon(template)) return;
        // A remembered icon is independent of whether its control is enabled on this client.
        catalog.set(key, {
          ...record,
          aliases: Array.isArray(record.aliases) ? record.aliases.filter((alias) => typeof alias === 'string' && isItemId(alias)) : [],
          caption: typeof record.caption === 'string' ? record.caption : key,
          key,
          label: typeof record.label === 'string' ? record.label : key,
          template,
          ...(portable ? { remembered: true, nativeHidden: undefined, current: false } : {}),
        });
      });
    });
    ['brand', 'menu'].forEach((part) => {
      const record = stored?.chrome?.[part];
      const template = sourceTemplate(record?.template);
      if (template) chrome[part] = { kind: record.kind || '', label: record.label || '', template };
    });
    if (layoutMode() === 'desktop' && chrome.menu?.kind === 'modern') delete chrome.menu;
  }
  return { catalog: [...catalog.values()], chrome, scopeKey: scope.key };
}

function cacheHeaderSources(catalog, chrome, rememberIcons = false) {
  const scope = currentScope();
  if (!scope.key) return;

  const serialize = (record) => ({ ...record, template: record.template.outerHTML });
  try {
    window.sessionStorage.setItem(SOURCE_CACHE_KEY, JSON.stringify({
      catalog: catalog.map(serialize),
      chrome: Object.fromEntries(Object.entries(chrome).map(([part, record]) => [part, serialize(record)])),
      serverId: scope.serverId,
      userId: scope.userId,
    }));
  } catch {}

  if (!rememberIcons) return;
  try {
    const visuals = catalog.filter((record) => !record.dashboard && portableIcon(record.template)).map((record) => ({
      aliases: record.aliases,
      caption: record.caption,
      inline: record.inline,
      key: record.key,
      label: record.label,
      template: record.template.outerHTML,
    }));
    if (!visuals.length) return;
    const serialized = JSON.stringify({ catalog: visuals, serverId: scope.serverId, userId: scope.userId });
    if (window.localStorage.getItem(VISUAL_CACHE_KEY) !== serialized) window.localStorage.setItem(VISUAL_CACHE_KEY, serialized);
  } catch {}
}

function dashboardLegacyHeader() {
  // Jellyfin Web 12 keeps the native legacy controls mounted even on its React dashboard.
  return document.querySelector('.skinHeader:not(.osdHeader) .headerTop')?.closest('.skinHeader') || null;
}

function createHeaderFeature() {
  const cached = cachedHeaderSources();
  const state = {
    bodyObserver: null,
    catalog: cached.catalog,
    catalogSignature: catalogSignature(cached.catalog),
    chrome: cached.chrome,
    chromeSignature: chromeSignature(cached.chrome),
    loadingTimer: 0,
    mount: null,
    publicSettings: PUBLIC_SETTINGS,
    queriedViewIds: new Set(),
    reconcileTimer: 0,
    reportedItems: new Map(),
    reportPending: false,
    settings: PUBLIC_SETTINGS,
    settingsResolved: false,
    settingsRequest: 0,
    settingsRetryDelay: 1000,
    settingsRetryTimer: 0,
    settingsScope: '',
    sourceCacheScope: cached.scopeKey,
    sourceObserver: null,
    started: false,
    stopWatching: null,
    viewRequest: null,
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
    cacheHeaderSources(state.catalog, state.chrome);
    notifyCatalogChanged();
  }

  function hydrateHeaderSourceCache(force = false) {
    const scope = currentScope();
    if (!scope.key || (!force && scope.key === state.sourceCacheScope)) return;

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
      resetHeaderUserViews();
      state.reportedItems = new Map();
      state.reportPending = false;
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
    resetHeaderUserViews();
    state.reportedItems = new Map();
    state.reportPending = false;
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

  function resetHeaderUserViews() {
    state.queriedViewIds = new Set();
    state.viewRequest = null;
    setHeaderUserViews();
  }

  function refreshHeaderUserViews(records) {
    const client = window.ApiClient;
    const scope = currentScope();
    if (state.viewRequest || !scope.key || scope.key !== state.settingsScope || typeof client?.ajax !== 'function') return;

    const queried = state.queriedViewIds;
    const ids = records.filter((record) => record.key.startsWith('jellyfin:view:')).map((record) => record.key.slice('jellyfin:view:'.length));
    if (ids.every((id) => queried.has(id))) return;
    ids.forEach((id) => queried.add(id));

    state.viewRequest = client.ajax({ type: 'GET', dataType: 'json', url: client.getUrl('UserViews', { userId: scope.userId }) })
      .then((result) => {
        if (!state.started || queried !== state.queriedViewIds || scope.key !== currentScope().key || !Array.isArray(result?.Items)) return;
        result.Items.forEach((item) => { if (item.Id) queried.add(item.Id.toLowerCase()); });
        setHeaderUserViews(result.Items);
      })
      .catch(() => {})
      .finally(() => {
        if (queried !== state.queriedViewIds) return;
        state.viewRequest = null;
        scheduleReconcile();
      });
  }

  function reportHeaderItems(records) {
    const client = window.ApiClient;
    const scope = currentScope();
    if (state.reportPending || !state.settingsResolved || !scope.key || scope.key !== state.settingsScope || !client?.ajax) return;

    const reported = state.reportedItems;
    const items = records
      .filter((record) => isItemId(record.key) && (record.inline || record.fallback || record.separate) && !record.nativeHidden && !record.key.startsWith('kt:breadcrumb-') &&
        !(record.key.startsWith('source:') && record.source.matches('.emby-tab-button[data-index]')))
      .map(({ key, label, caption }) => ({ id: key, label: label.replace(/\s+/g, ' ').trim().slice(0, 160), caption: caption.replace(/\s+/g, ' ').trim().slice(0, 160) }))
      .filter((item) => item.label && item.caption && !/[\x00-\x1f\x7f-\x9f]/.test(item.label + item.caption) && reported.get(item.id) !== JSON.stringify(item))
      .slice(0, MAX_CATALOG_ITEMS);
    if (!items.length) return;

    state.reportPending = true;
    client.ajax({ type: 'POST', contentType: 'application/json', url: client.getUrl('SleekFin/Header/Catalog'), data: JSON.stringify(items) })
      .then(() => {
        if (reported !== state.reportedItems) return;
        items.forEach((item) => reported.set(item.id, JSON.stringify(item)));
        scheduleReconcile();
      })
      .catch(() => {})
      .finally(() => {
        if (reported === state.reportedItems) state.reportPending = false;
      });
  }

  function captureHeaderSources(surface, dashboard = false) {
    if ((!surface && !dashboard) || !currentScope().key) return;

    let records = discoverHeaderControls(surface);
    if (dashboard) {
      const merged = new Map(state.catalog
        .filter((record) => !record.dashboard)
        .map((record) => [record.key, record]));
      records.forEach((record) => {
        if (!isItemId(record.key) || record.key.startsWith('source:')) return;
        const previous = merged.get(record.key);
        if (previous && !previous.remembered && !record.key.startsWith('kt:')) return;
        merged.set(record.key, {
          ...record,
          dashboard: true,
          current: false,
          inline: record.source.matches('.kefinTweaks-breadcrumb-element') && !record.nativeHidden,
        });
      });

      const legacy = dashboardLegacyHeader();
      if (legacy && legacy !== surface?.header) {
        discoverHeaderControls({ header: legacy, kind: 'legacy' }).forEach((record) => {
          if (!record.key.startsWith('jellyfin:') || record.fallback || merged.has(record.key)) return;
          merged.set(record.key, { ...record, dashboard: true, current: false, inline: false, nativeHidden: undefined });
        });
      }
      records = [...merged.values()];
    } else {
      refreshHeaderUserViews(records);
      if (!state.viewRequest) reportHeaderItems(records);
      const liveKeys = new Set();
      records.forEach((record) => {
        liveKeys.add(record.key);
        record.aliases?.forEach((alias) => liveKeys.add(alias));
      });
      const retained = state.catalog
        .filter((record) => !liveKeys.has(record.key))
        .map((record) => ({ ...record, current: false, inline: false, nativeHidden: record.dashboard || record.remembered ? undefined : true }));
      records.push(...retained);
    }
    const catalog = records.slice(0, MAX_CATALOG_ITEMS);
    const signature = catalogSignature(catalog);
    let changed = false;
    if (signature !== state.catalogSignature) {
      state.catalog = catalog.map((record) => ({
        aliases: record.aliases,
        caption: record.caption,
        current: record.current,
        dashboard: record.dashboard,
        remembered: record.remembered,
        inline: record.inline,
        key: record.key,
        label: record.label,
        nativeHidden: record.nativeHidden,
        template: record.template,
      }));
      state.catalogSignature = signature;
      changed = true;
    }

    const discoveredChrome = discoverHeaderChrome(surface);
    const nextChrome = { ...state.chrome, ...discoveredChrome };
    if (!discoveredChrome.menu && surface?.kind === 'modern' && layoutMode() === 'desktop') delete nextChrome.menu;
    const nextChromeSignature = chromeSignature(nextChrome);
    if (nextChromeSignature !== state.chromeSignature) {
      state.chrome = nextChrome;
      state.chromeSignature = nextChromeSignature;
      changed = true;
    }

    if (changed) {
      cacheHeaderSources(state.catalog, state.chrome, !dashboard);
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
    document.documentElement.classList.remove(...ROOT_CLASSES);
  }

  function reconcile() {
    if (!state.started) return;
    if (syncServerScope()) requestSettings();
    if (isExcludedRoute()) {
      unmount();
      if (isDashboardRoute()) {
        const surface = findSurface();
        watchSourceChanges(surface);
        captureHeaderSources(surface, true);
      } else state.sourceObserver.disconnect();
      finishLoading();
      return;
    }
    const surface = findSurface();
    watchSourceChanges(surface);
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
      document.documentElement.classList.add(...ROOT_CLASSES);
      finishLoading();
    }
    const mount = state.mount;
    const root = document.documentElement;
    const bar = mount.layoutMode === 'compact' ? mount.proxy : mount.cluster || mount.proxy;
    measureHeaderStyles(mount.toolbar,
      mount.header.querySelector('[data-sleekfin-header-identity]') || document.querySelector('.sleekfin-header-fallback-brand'),
      bar, (name, value) => setStyle(mount, root, name, value));
    adapter.refresh(mount);
    captureHeaderSources(surface);
  }

  function watchSourceChanges(surface) {
    state.sourceObserver.disconnect();
    const external = Array.from(document.querySelectorAll(HEADER_SOURCE_SELECTOR)).filter((source) => !source.closest('.skinHeader, header.MuiAppBar-root, [data-sleekfin-header-proxy], .sleekfin-builder-preview'));
    const roots = [...new Set([surface?.header, isDashboardRoute() ? dashboardLegacyHeader() : null, ...external.filter((source) => !external.some((parent) => parent !== source && parent.contains(source)))])].filter(Boolean);
    roots.forEach((root) => state.sourceObserver.observe(root, { attributes: true, attributeOldValue: true, characterData: true, childList: true, subtree: true }));
    state.sourceObserver.observe(document.head, { attributes: true, attributeFilter: ['href', 'disabled', 'media'], attributeOldValue: true, childList: true, characterData: true, subtree: true });
    [document.documentElement, document.body].forEach((root) => state.sourceObserver.observe(root, { attributes: true, attributeFilter: ['class', 'data-active-page'], attributeOldValue: true }));
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

        const normalized = normalizeSettings(settings);
        state.publicSettings = normalizeSettings({ enabled: normalized.enabled });
        state.settingsResolved = true;
        state.settingsRetryDelay = 1000;
        state.settings = normalized;
        scheduleReconcile();
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

  function onVisualCacheChange(event) {
    if (event.key !== VISUAL_CACHE_KEY || !isDashboardRoute()) return;
    hydrateHeaderSourceCache(true);
    scheduleReconcile();
  }

  function onStylesheetLoad(event) {
    if (event.target.matches?.('link[rel="stylesheet"]')) scheduleReconcile();
  }

  function start() {
    if (state.started || !document.body) return;

    state.started = true;
    state.sourceObserver = new MutationObserver((changes) => {
      if (changes.some((change) => {
        const target = change.target.nodeType === 1 ? change.target : change.target.parentElement;
        if (target?.closest('[data-sleekfin-header-proxy], .sleekfin-builder-preview')) return false;
        if (change.type === 'attributes') return !change.attributeName.startsWith('data-sleekfin-') && change.attributeName !== 'tabindex' && change.oldValue !== target.getAttribute(change.attributeName);
        return change.type !== 'childList' || [...change.addedNodes, ...change.removedNodes].some((node) => node.nodeType !== 1 || !node.matches('[data-sleekfin-header-proxy], .sleekfin-header-fallback-brand'));
      })) scheduleReconcile();
    });
    window.addEventListener(SETTINGS_CHANGED_EVENT, requestSettings);
    window.addEventListener('storage', onVisualCacheChange);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    document.addEventListener('load', onStylesheetLoad, true);
    state.stopWatching = dom.watchSpa(watchHeader, {
      events: WINDOW_EVENTS,
      viewshow: true,
    });
    // Portaled menus and provider rails can mount outside the active header.
    state.bodyObserver = new MutationObserver((changes) => {
      if (changes.some((change) => [...change.addedNodes, ...change.removedNodes].some((node) => node.nodeType === 1 && !node.closest('[data-sleekfin-header-proxy], .sleekfin-builder-preview') && (node.matches(HEADER_SOURCE_SELECTOR) || node.querySelector(HEADER_SOURCE_SELECTOR))))) scheduleReconcile();
    });
    state.bodyObserver.observe(document.body, { childList: true, subtree: true });
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
    window.removeEventListener('storage', onVisualCacheChange);
    document.removeEventListener('scroll', onScroll, true);
    document.removeEventListener('load', onStylesheetLoad, true);
    state.stopWatching?.();
    state.stopWatching = null;
    state.bodyObserver?.disconnect();
    state.bodyObserver = null;
    state.sourceObserver?.disconnect();
    state.sourceObserver = null;
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

  return { cloneCatalogItem, cloneChromePart, getCatalog, measureHeaderStyles, start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.header?.stop?.();
features.header = createHeaderFeature();
features.header.start();
