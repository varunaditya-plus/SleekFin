import { createScrollFeature } from '../scroll/index.js';
import { createMenuFeature } from './menus.js';
import { createSelectFeature } from './selects.js';

const ROOT_CLASS = 'sleekfin-main-ui';
const WINDOW_EVENTS = ['hashchange', 'load', 'pageshow', 'popstate', 'sleekfin:details-settings-changed'];
const ENHANCED_THEME = {
  name: 'SleekFin',
  uniqueIdentifier: '--sleekfin-accent',
  variables: {
    panelBg: '--sleekfin-surface',
    panelBgFallback: '#101113',
    secondaryBg: '--sleekfin-surface-raised',
    secondaryBgFallback: '#1a1c20',
    primaryAccent: '--sleekfin-accent',
    primaryAccentFallback: '#dc2626',
    textColor: '--sleekfin-text',
    textColorFallback: '#f1f2f4',
    altAccent: '--sleekfin-border',
    altAccentFallback: '#26292e',
    blur: null,
    blurFallback: '18px',
  },
};

function syncEnhancedTheme(active) {
  const themer = window.JellyfinEnhanced?.themer;
  if (!themer?.registerTheme || !themer.detectActiveTheme) return;

  if (active) {
    if (!themer.supportedThemes.sleekfin) themer.registerTheme('sleekfin', ENHANCED_THEME);
    // JE has selected preset borders inline with !important from its theme accent.
    themer.activeTheme = { key: 'sleekfin', ...themer.supportedThemes.sleekfin };
  } else if (themer.activeTheme?.key === 'sleekfin') {
    themer.detectActiveTheme();
  }
}

function createThemeFeature() {
  let started = false;
  let enhancedTimer = null;
  // Owned here because this bundle is always injected and is not behind a feature toggle, so it is the
  // one place guaranteed to be running on the pages whose scroll position Jellyfin does not restore.
  const scroll = createScrollFeature();
  const menus = createMenuFeature();
  const selects = createSelectFeature();

  function isDashboardRoute() {
    const route = (window.location.hash.slice(1) || window.location.pathname).split('?')[0].toLowerCase();
    return route === '/dashboard' || route.startsWith('/dashboard/') || route === '/configurationpage' || route === '/metadata';
  }

  function reconcile() {
    const active = !isDashboardRoute();
    document.documentElement.classList.toggle(ROOT_CLASS, active);
    const dropdownsEnabled = (document.documentElement.dataset.sleekfinDropdownStyle || 'SleekFin') === 'SleekFin';
    if (document.documentElement.classList.contains('sleekfin-menu-ui') !== dropdownsEnabled) {
      if (dropdownsEnabled) {
        document.documentElement.classList.add('sleekfin-menu-ui');
        menus.start();
        selects.start();
      } else {
        menus.stop();
        selects.stop();
        document.documentElement.classList.remove('sleekfin-menu-ui');
      }
    }
    syncEnhancedTheme(active);
    if (!enhancedTimer && !window.JellyfinEnhanced?.initialized && document.querySelector('script[src*="/JellyfinEnhanced/"]')) {
      let checks = 0;
      // JE loads its themer asynchronously, and later detects the theme again after initialization.
      enhancedTimer = window.setInterval(() => {
        syncEnhancedTheme(!isDashboardRoute());
        if (window.JellyfinEnhanced?.initialized || ++checks >= 120) {
          window.clearInterval(enhancedTimer);
          enhancedTimer = null;
        }
      }, 250);
    }
  }

  function start() {
    if (started || !document.documentElement) return;

    started = true;
    WINDOW_EVENTS.forEach((eventName) => window.addEventListener(eventName, reconcile));
    reconcile();
    scroll.start();
  }

  function stop() {
    started = false;
    WINDOW_EVENTS.forEach((eventName) => window.removeEventListener(eventName, reconcile));
    if (enhancedTimer) window.clearInterval(enhancedTimer);
    enhancedTimer = null;
    document.documentElement?.classList.remove(ROOT_CLASS);
    syncEnhancedTheme(false);
    scroll.stop();
    menus.stop();
    selects.stop();
    document.documentElement?.classList.remove('sleekfin-menu-ui');
  }

  return { start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.theme?.stop?.();
features.theme = createThemeFeature();
features.theme.start();
