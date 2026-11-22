import { dom } from '../../shared/runtime.js';

export const KEFIN_SOURCE_SELECTOR = '[data-kefin-custom-menu-link], [data-kefin-custom-menu-top-link], [data-kefin-custom-menu-top-right], [data-kefin-custom-user-menu-link], [data-kefintweaks-user-menu-config-button], [data-kefin-custom-menu-more], [data-kefin-desktop-hamburger], .kefin-home-category-btn, .kefin-home-create-section-btn, .kefinTweaks-breadcrumb-element, .btnRecommendations, .btnAdmin';
export const HEADER_CONTROL_SELECTOR = 'button, a[href], [role="button"], [role="link"], [role="tab"]';
export const JE_LAUNCHER_SELECTOR = '.je-header-more-toggle, .je-header-launcher';
export const KEFIN_HOME_SELECTOR = '#kefin-home-category-rail, #kefin-home-create-section-btn';
const MODERN_FALLBACK_SELECTOR = '.MuiDrawer-paper, #user-view-overflow-menu';
const LEGACY_FALLBACK_SELECTOR = '.mainDrawer-scrollContainer, .mainDrawer';
const PROVIDER_FALLBACK_SELECTOR = '.customMenuOptions, .jellyfinEnhancedSection';
export const HEADER_SOURCE_ROOT_SELECTOR = `header.MuiAppBar-root, .skinHeader, ${MODERN_FALLBACK_SELECTOR}, ${LEGACY_FALLBACK_SELECTOR}, ${PROVIDER_FALLBACK_SELECTOR}`;
const CONDITIONAL_VIEW_KEYS = new Map([
  ['boxsets', 'jellyfin:collections'],
  ['folders', 'jellyfin:folders'],
  ['livetv', 'jellyfin:live-tv'],
  ['playlists', 'jellyfin:playlists'],
]);
const CONDITIONAL_VIEW_IDS = new Set(CONDITIONAL_VIEW_KEYS.values());
const LIVE_TV_TAB = /^#?\/livetv\?(?:[^#]*&)?tab=/;
const userViewKeys = new Map();

export function isNativeMenu(source) {
  return source.matches('button:not([data-kefin-desktop-hamburger])') && Boolean(source.querySelector('svg[data-testid="MenuIcon"]'));
}

// Generic /list links for legacy views and Folders carry the ID, but no collection type.
export function setHeaderUserViews(views = []) {
  userViewKeys.clear();
  views.forEach(({ Id, CollectionType }) => {
    const key = CONDITIONAL_VIEW_KEYS.get(CollectionType?.toLowerCase());
    if (Id && key) userViewKeys.set(Id.toLowerCase(), key);
  });
}

export const LABELS = Object.assign(Object.create(null), {
  'jellyfin:audio-player': 'Audio player',
  'jellyfin:back': 'Back',
  'jellyfin:cast': 'Cast to device',
  'jellyfin:favorites': 'Favorites',
  'jellyfin:home': 'Home',
  'jellyfin:more': 'More',
  'jellyfin:search': 'Search',
  'jellyfin:syncplay': 'SyncPlay',
  'jellyfin:user-menu': 'User Menu',
  'je:active-streams': 'Active Streams',
  'je:random': 'Random',
});
const HOME_SOURCE = dom.element('<a href="#/"><span class="material-icons home"></span>Home</a>');
let cloneSequence = 0;

function urlFor(anchor) {
  try {
    return new URL(anchor?.getAttribute('href') || '', document.baseURI);
  } catch {
    return null;
  }
}

function routeFor(anchor) {
  const href = anchor?.getAttribute('href') || '';
  const hashIndex = href.indexOf('#/');
  if (hashIndex >= 0) return href.slice(hashIndex).toLowerCase();

  try {
    const url = new URL(href, document.baseURI);
    return `${url.pathname}${url.search}${url.hash}`.toLowerCase();
  } catch {
    return href.toLowerCase();
  }
}

export function appRoute() {
  return (window.location.hash.slice(1) || window.location.pathname).split('?')[0].toLowerCase().replace(/^!/, '').replace(/\/+$/, '') || '/';
}

export function isDashboardRoute() {
  const route = appRoute();
  return document.body?.classList.contains('dashboardDocument') || route === '/dashboard' || route.startsWith('/dashboard/') || route === '/configurationpage' || route === '/metadata';
}

function libraryId(source, route) {
  const dataId = source.getAttribute('data-itemid') || source.getAttribute('data-id');
  const match = /[?&](?:topparentid|parentid)=([^&#]+)/i.exec(route);
  let routeId = '';
  if (match) {
    try {
      routeId = decodeURIComponent(match[1]);
    } catch {
      routeId = '';
    }
  }
  const value = dataId || routeId;
  return /^[a-f\d-]{16,64}$/i.test(value) ? value.toLowerCase() : '';
}

function conditionalViewKey(route, viewId) {
  const view = /^#?\/(boxsets|playlists|livetv)(?:\?|$)/.exec(route)?.[1];
  if (LIVE_TV_TAB.test(route)) return null;
  return CONDITIONAL_VIEW_KEYS.get(view) || (/^#?\/list\?/.test(route) && viewId ? userViewKeys.get(viewId) : null);
}

function stableClasses(source) {
  return Array.from(source.classList)
    .filter((name) => !/^Mui|^css-|^(?:button|hide|show|selected|active)$/i.test(name))
    .sort()
    .join('.');
}

function stableData(source) {
  return Array.from(source.attributes)
    .filter((attribute) => attribute.name.startsWith('data-') && !/^data-sleekfin-|^data-testid$/.test(attribute.name))
    .map((attribute) => `${attribute.name}=${attribute.value}`)
    .sort()
    .join('&');
}

function digest(value) {
  const hashes = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const primes = [0x01000193, 0x27d4eb2d, 0x165667b1, 0x85ebca77];
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    for (let lane = 0; lane < hashes.length; lane += 1) {
      hashes[lane] = Math.imul(hashes[lane] ^ (code + lane * 17), primes[lane]);
    }
  }
  return hashes.map((hash) => (hash >>> 0).toString(16).padStart(8, '0')).join('');
}

function stableElementOrdinal(source) {
  const boundary = source.closest('header, .skinHeader') || document;
  const classes = stableClasses(source);
  const role = source.getAttribute('role') || source.tagName.toLowerCase();
  const peers = Array.from(boundary.querySelectorAll(source.tagName)).filter((element) => {
    const peerRole = element.getAttribute('role') || element.tagName.toLowerCase();
    return !element.closest('[data-sleekfin-header-proxy], .sleekfin-builder-preview') && peerRole === role && stableClasses(element) === classes;
  });
  return peers.indexOf(source);
}

function genericIdentity(source, route) {
  if (route) {
    const url = urlFor(source);
    return `href:${url && url.origin !== window.location.origin ? url.href : route}`;
  }
  if (source.id && !/^mui-|^:r/i.test(source.id)) return `id:${source.id}`;

  const controls = source.getAttribute('aria-controls') || '';
  if (controls && !/^:r/i.test(controls)) return `controls:${controls}`;

  const data = stableData(source);
  if (data) return `data:${data}`;

  const classes = stableClasses(source);
  const role = source.getAttribute('role') || source.tagName.toLowerCase();
  const ordinal = stableElementOrdinal(source);
  const label = source.getAttribute('aria-label') || source.getAttribute('title') || source.textContent.trim();
  if (classes && ordinal >= 0) return `element:${role}|${classes}|${ordinal}`;
  return label ? `element:${role}||${label}` : '';
}

function seerrFinId(source, route) {
  const dataId = source.getAttribute('data-seerrfin-tab') || source.getAttribute('data-seerrfin-menu-nav');
  const match = /[?&]seerrfintab=([a-z0-9-]+)(?:&|$)/i.exec(route);
  return (dataId || match?.[1] || '').toLowerCase();
}

function kefinCategoryKey(id) {
  return `kt:category-${/^[a-z0-9-]{1,48}$/.test(id) ? id : digest(id)}`;
}

function kefinLinkKey(identity) {
  if (identity.endsWith('||action:KefinTweaksSkinManager.toggleAppearancePopover')) return 'kt:appearance';
  if (identity.endsWith('||action:KefinTweaksConfiguration.openConfigurationModal')) return 'kt:settings';
  if (identity.startsWith('Watch Together||')) return 'kt:watch-together';
  if (identity.startsWith('Watchlist||')) return 'kt:watchlist';
  if (identity === 'Games||#/games') return 'kt:games';
  return `kt:link-${digest(identity)}`;
}

function kefinKey(source) {
  if (source.matches('.kefin-home-category-btn')) return kefinCategoryKey(source.getAttribute('data-category-id') || '');
  if (source.matches('.kefin-home-create-section-btn')) return 'kt:create-section';
  if (source.matches('[data-kefin-desktop-hamburger]')) return 'kt:menu';
  if (source.matches('[data-kefintweaks-user-menu-config-button]')) return 'kt:settings';
  if (source.matches('.btnRecommendations')) return 'kt:recommendations';
  if (source.matches('.btnAdmin')) return 'kt:admin';
  if (source.matches('.kefinTweaks-breadcrumb-element')) {
    const index = Array.from(source.parentElement.children).filter((element) => element.matches('.kefinTweaks-breadcrumb-element')).indexOf(source);
    return `kt:breadcrumb-${index}`;
  }

  const identity = source.getAttribute('data-kefin-custom-menu-top-right') || source.getAttribute('data-kefin-custom-menu-top-link') || source.getAttribute('data-kefin-custom-user-menu-link') || source.getAttribute('data-kefin-custom-menu-link');
  return identity ? kefinLinkKey(identity) : '';
}

function keyForSource(source) {
  if (!source || source.closest('[data-sleekfin-header-proxy], .sleekfin-builder-preview, .sleekfin-details-back-root')) return null;
  if (source.matches(`.mainDrawerButton, [data-sleekfin-header-brand], ${JE_LAUNCHER_SELECTOR}`)) return null;

  const kefin = kefinKey(source);
  if (kefin) return kefin;
  if (source.parentElement?.matches('.MuiToolbar-root') && isNativeMenu(source)) return null;

  const href = source.matches('a[href]') ? source.getAttribute('href').trim() : '';
  const navigates = href && href !== '#' && !/^javascript:/i.test(href);
  const route = navigates ? routeFor(source) : '';
  const url = navigates ? urlFor(source) : null;
  const external = Boolean(url && url.origin !== window.location.origin);
  const internalRoute = external ? '' : route;
  if (internalRoute === '#/' || internalRoute === '/') return null;

  const enhanced = /^je-native-tab-(?:btn|link)-([a-z0-9-]+)$/i.exec(source.id || '');
  if (enhanced) return `je:${enhanced[1].toLowerCase()}`;
  if (source.id === 'randomItemButton') return 'je:random';
  if (source.id === 'je-active-streams') return 'je:active-streams';

  const seerrFin = seerrFinId(source, internalRoute);
  if (seerrFin) return `sf:${seerrFin}`;

  if (source.matches('.emby-tab-button[data-index="0"], .emby-tab-button[data-index="1"]') && source.closest('.headerTabs') && source.closest('.skinHeader.noHomeButtonHeader')) {
    return source.dataset.index === '0' ? 'jellyfin:home' : 'jellyfin:favorites';
  }

  if (source.matches('.headerSyncButton, [aria-controls="app-sync-play-menu"]')) return 'jellyfin:syncplay';
  if (source.matches('.headerCastButton, [aria-controls="app-remote-play-menu"], [aria-controls="app-remote-play-active-menu"]')) return 'jellyfin:cast';
  if (source.matches('[aria-controls="user-view-overflow-menu"], [data-kefin-custom-menu-more]')) return 'jellyfin:more';
  if (source.matches('.headerSearchButton') || /^#?\/search(?:[?/#]|$)/.test(internalRoute)) return 'jellyfin:search';
  if (source.matches('.headerUserButton, [aria-controls="app-user-menu"]')) return 'jellyfin:user-menu';
  if (source.matches('.headerAudioPlayerButton')) return 'jellyfin:audio-player';
  if (source.matches('.headerHomeButton') || /^#?\/home(?:\.html)?(?:\?tab=0)?$/.test(internalRoute)) return 'jellyfin:home';
  if (source.matches('.headerBackButton') || source.querySelector('svg[data-testid="ArrowBackIcon"]')) return 'jellyfin:back';
  if (/[?&]tab=1(?:&|$)/.test(internalRoute) && /#?\/home(?:[?/#]|$)/.test(internalRoute)) return 'jellyfin:favorites';

  // Jellyfin replaces these tabs with page-local controls when leaving Home.
  if (source.matches('.emby-tab-button[data-index]') && source.closest('.headerTabs')) return null;

  const viewId = libraryId(source, internalRoute);
  const namedView = conditionalViewKey(internalRoute, viewId);
  if (namedView) return namedView;
  if (viewId && !LIVE_TV_TAB.test(internalRoute)) return `jellyfin:view:${viewId}`;

  const identity = genericIdentity(source, route);
  return identity ? `source:v1:${digest(identity)}` : null;
}

function addCandidates(result, seen, container, selector, zone) {
  if (!container) return;
  if (container.matches(selector)) addCandidate(result, seen, container, zone);
  container.querySelectorAll(selector).forEach((source) => {
    const parentControl = source.parentElement?.closest(selector);
    if (!parentControl || !container.contains(parentControl)) addCandidate(result, seen, source, zone);
  });
}

function addCandidate(result, seen, source, zone) {
  if (source && !seen.has(source) && !source.closest('.osdHeader, #kefinTweaks-popover-container') && (zone === 'fallback' || !source.closest('[role="dialog"]'))) {
    seen.add(source);
    const fallback = zone === 'fallback' || Boolean(source.closest('[role="menu"], [data-kefin-custom-overflow-menu]'));
    result.push({ source, fallback, separate: !fallback && zone === 'rail' });
  }
}

function modernCandidates(header) {
  const result = [];
  const seen = new Set();
  const toolbar = header?.querySelector('.MuiToolbar-root');
  addCandidates(result, seen, toolbar, HEADER_CONTROL_SELECTOR, 'header');
  document.querySelectorAll(`${MODERN_FALLBACK_SELECTOR}, ${PROVIDER_FALLBACK_SELECTOR}`).forEach((container) => addCandidates(result, seen, container, container.matches('.jellyfinEnhancedSection') ? HEADER_CONTROL_SELECTOR : 'a[href]', 'fallback'));
  return result;
}

function legacyCandidates(surface) {
  const result = [];
  const seen = new Set();
  const header = surface?.header;
  addCandidates(result, seen, header?.querySelector('.headerLeft'), HEADER_CONTROL_SELECTOR, 'header');
  Array.from(surface?.cluster?.children || [])
    .filter((source) => source.matches(HEADER_CONTROL_SELECTOR))
    .forEach((source) => addCandidate(result, seen, source, 'header'));
  addCandidates(result, seen, header?.querySelector('.headerTabs'), HEADER_CONTROL_SELECTOR, 'header');
  addCandidates(result, seen, header?.querySelector('.headerRight'), HEADER_CONTROL_SELECTOR, 'header');
  addCandidates(result, seen, header, HEADER_CONTROL_SELECTOR, 'header');
  document.querySelectorAll(`${LEGACY_FALLBACK_SELECTOR}, ${PROVIDER_FALLBACK_SELECTOR}`).forEach((container) => addCandidates(result, seen, container, container.matches('.jellyfinEnhancedSection') ? HEADER_CONTROL_SELECTOR : 'a[href]', 'fallback'));
  return result;
}

function addKefinCandidates(candidates, surface) {
  const seen = new Set(candidates.map((candidate) => candidate.source));
  document.querySelectorAll(KEFIN_SOURCE_SELECTOR).forEach((source) => {
    if (!source.matches(`${HEADER_CONTROL_SELECTOR}, .kefinTweaks-breadcrumb-element`) || source.closest('.osdHeader, [data-sleekfin-header-proxy], .sleekfin-builder-preview')) return;
    const homeControl = source.closest(KEFIN_HOME_SELECTOR);
    const header = source.closest('header.MuiAppBar-root, .skinHeader');
    if (header && header !== surface.header && !homeControl) return;
    addCandidate(candidates, seen, source, homeControl ? 'rail' : surface.header.contains(source) ? 'header' : 'fallback');
  });
}

function candidateScore(candidate) {
  const inline = candidate.fallback ? 0 : 20;
  const owned = candidate.source.hasAttribute('data-sleekfin-header-source-hidden') || candidate.source.hasAttribute('data-sleekfin-header-source-anchor') ? 4 : 0;
  const nativeMore = candidate.source.matches('[aria-controls="user-view-overflow-menu"]:not([data-kefin-custom-menu-more])');
  return inline + (sourceNativeHidden(candidate.source) ? 0 : 16) + (nativeMore ? 8 : 0) + owned + (dom.isVisible(candidate.source) ? 2 : 0);
}

function namespaceSvgIds(clone) {
  cloneSequence += 1;
  const svgs = clone.matches('svg') ? [clone] : Array.from(clone.querySelectorAll('svg'));
  svgs.forEach((svg, svgIndex) => {
    const ids = new Map();
    [svg, ...svg.querySelectorAll('[id]')].filter((element) => Boolean(element.id)).forEach((element, idIndex) => {
      const original = element.id;
      const namespaced = `sleekfin-source-svg-${cloneSequence}-${svgIndex}-${idIndex}`;
      ids.set(original, namespaced);
      element.id = namespaced;
    });
    if (!ids.size) return;

    [svg, ...svg.querySelectorAll('*')].forEach((element) => {
      Array.from(element.attributes).forEach((attribute) => {
        let value = attribute.value;
        Array.from(ids.keys())
          .sort((left, right) => right.length - left.length)
          .forEach((original) => {
            value = value.split(`#${original}`).join(`#${ids.get(original)}`);
          });
        if (/^aria-(?:describedby|labelledby)$/.test(attribute.name)) {
          value = value
            .split(/\s+/)
            .map((token) => ids.get(token) || token)
            .join(' ');
        }
        if (value !== attribute.value) element.setAttribute(attribute.name, value);
      });
    });
  });
}

function cleanClone(node) {
  const clone = node.cloneNode(true);
  [clone, ...clone.querySelectorAll('*')].forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      if ((attribute.name === 'id' && !element.closest('svg')) || attribute.name === 'name' || attribute.name === 'form' || attribute.name === 'tabindex' || attribute.name.startsWith('on')) {
        element.removeAttribute(attribute.name);
      }
      if ((attribute.name === 'href' || attribute.name === 'xlink:href') && !attribute.value.startsWith('#')) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  clone.querySelectorAll('.MuiTouchRipple-root').forEach((ripple) => ripple.remove());
  if (clone.matches('.material-icons')) {
    clone.classList.remove('actionsheetMenuItemIcon', 'listItemIcon', 'listItemIcon-transparent');
    clone.style.removeProperty('font-size');
    const style = node.closest(KEFIN_SOURCE_SELECTOR) && window.getComputedStyle(node);
    if (style && style.backgroundImage !== 'none') {
      clone.style.backgroundImage = style.backgroundImage;
      clone.style.backgroundPosition = style.backgroundPosition;
      clone.style.backgroundRepeat = style.backgroundRepeat;
      clone.style.backgroundSize = style.backgroundSize;
      clone.style.color = style.color;
    }
    if (!clone.getAttribute('style')) clone.removeAttribute('style');
  }
  if (clone.matches('img')) {
    clone.src = node.currentSrc || node.src;
    clone.removeAttribute('srcset');
  }
  clone.setAttribute('data-sleekfin-header-source-icon', 'true');
  return clone;
}

function visualNodes(source) {
  if (providerFor('', source) === 'JE' || source.id === 'randomItemButton') {
    const nodes = Array.from(source.children).filter((node) => node.matches('svg, img, .material-icons, [aria-hidden="true"]') || node.querySelector('svg, img, .material-icons') || node.style.backgroundImage);
    if (nodes.length) return nodes.map((node) => {
      const clone = cleanClone(node);
      const color = window.getComputedStyle(node).color;
      if (color) clone.style.color = color;
      return clone;
    });
  }

  const startIcon = source.querySelector('.MuiButton-startIcon');
  if (startIcon) return [cleanClone(startIcon)];

  const badge = source.querySelector('.MuiBadge-root');
  if (badge) return [cleanClone(badge)];

  const avatar = source.querySelector('.MuiAvatar-root');
  if (avatar) return [cleanClone(avatar)];

  const image = source.querySelector('img');
  if (image) return [cleanClone(image)];

  const materialIcon = source.querySelector('.material-icons');
  if (materialIcon) return [cleanClone(materialIcon)];

  const endIcon = source.querySelector('.MuiButton-endIcon');
  if (endIcon) return [cleanClone(endIcon)];

  const svg = source.querySelector('svg');
  if (svg) return [cleanClone(svg)];

  const background = Array.from(source.querySelectorAll('*')).find((element) => {
    const inline = element.style?.backgroundImage || '';
    return inline && inline !== 'none';
  });
  if (!background) return [];

  const clone = document.createElement('span');
  clone.setAttribute('data-sleekfin-header-source-icon', 'true');
  if (background.matches('.headerUserButtonRound, .MuiAvatar-root')) clone.setAttribute('data-sleekfin-header-source-avatar', 'true');
  clone.style.backgroundImage = background.style.backgroundImage;
  clone.style.backgroundPosition = background.style.backgroundPosition || 'center';
  clone.style.backgroundRepeat = background.style.backgroundRepeat || 'no-repeat';
  clone.style.backgroundSize = background.style.backgroundSize || 'cover';
  return [clone];
}

function visibleLabel(source) {
  if (source.hasAttribute('data-kefin-custom-menu-top-right')) return '';
  if (source.matches('.kefin-home-category-btn')) return source.closest('.kefin-home-category-item')?.querySelector('.kefin-home-category-btn-label')?.textContent.trim() || source.getAttribute('title') || '';
  const foreground = source.querySelector('.emby-button-foreground')?.textContent.trim();
  if (foreground) return foreground;

  const copy = source.cloneNode(true);
  copy
    .querySelectorAll('svg, img, .material-icons, .MuiButton-startIcon, .MuiButton-endIcon, .MuiBadge-root, .MuiAvatar-root, .MuiTouchRipple-root, .je-as-icon, .je-as-sup, .je-header-tray-label, .headerUserButtonRound, [aria-hidden="true"]')
    .forEach((element) => element.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
}

function fallbackLabel(key, source) {
  const label = source.getAttribute('data-header-label')?.trim() || LABELS[key] || source.getAttribute('title')?.trim() || source.getAttribute('aria-label')?.trim() || visibleLabel(source) || key;
  return LABELS[label] || label;
}

function providerFor(key, source) {
  if (key.startsWith('kt:') || kefinKey(source)) return 'KefinTweaks';
  if (key.startsWith('je:') || source?.closest('#je-header-buttons-group, .jellyfinEnhancedSection, [id^="je-"], [id^="jellyfinEnhanced"]')) return 'JE';
  if (key.startsWith('sf:')) return 'SeerrFin';
  return 'Jellyfin';
}

function captionFor(key, source, label) {
  const provider = providerFor(key, source);
  if (provider === 'Jellyfin' && LABELS[key]) return LABELS[key];
  const value = source.getAttribute('data-header-label')?.trim() || label || LABELS[key] || source.getAttribute('title')?.trim() || source.getAttribute('aria-label')?.trim() || 'Item';
  if (LABELS[value]) return LABELS[value];
  return value.toLowerCase() === provider.toLowerCase() || value.toLowerCase().startsWith(`${provider.toLowerCase()} `) ? value : `${provider} ${value}`;
}

export function sourceNativeHidden(source) {
  const homeControl = source.closest(KEFIN_HOME_SELECTOR);
  if (homeControl) {
    const page = document.documentElement.dataset.activePage;
    const tab = /[?&]tab=([^&#]+)/.exec(window.location.hash)?.[1];
    if (page !== undefined ? page !== 'home' : !['/', '/home', '/home.html'].includes(appRoute()) || Boolean(tab && tab !== '0')) return true;
  }
  if ((homeControl?.id === 'kefin-home-create-section-btn' || source.hasAttribute('data-kefin-desktop-hamburger')) && window.matchMedia?.('(max-width: 899px)').matches) return true;
  const breadcrumbs = source.closest('#kefinTweaks-breadcrumbs-wrapper');
  if (breadcrumbs && window.getComputedStyle(breadcrumbs).display === 'none') return true;
  if (source.matches('.headerHomeButton') && source.closest('.noHomeButtonHeader')) return true;
  const boundary = homeControl || (!source.closest('[role="menu"], .MuiDrawer-paper') && source.closest('header.MuiAppBar-root, .skinHeader'));
  for (let element = source; element; element = element !== boundary && boundary ? element.parentElement : null) {
    if (element.hidden || element.classList.contains('hide') || element.style.display === 'none') return true;
  }
  return false;
}

function sourceInline(candidate) {
  const source = candidate.source;
  if (candidate.fallback || candidate.separate || sourceNativeHidden(source)) return false;
  const owned = source.hasAttribute('data-sleekfin-header-source-hidden') || source.hasAttribute('data-sleekfin-header-source-anchor');
  return owned || source.classList.contains('je-header-overflowed') || dom.isVisible(source);
}

function sourceOpensPopup(key, source) {
  return (
    source.matches('[data-kefin-custom-menu-top-right], .kefinTweaks-breadcrumb-element') ||
    (source.hasAttribute('aria-haspopup') && source.getAttribute('aria-haspopup') !== 'false') ||
    Boolean(source.getAttribute('aria-controls')) ||
    ['jellyfin:audio-player', 'jellyfin:cast', 'jellyfin:syncplay', 'jellyfin:user-menu', 'jellyfin:more'].includes(key)
  );
}

function visualTemplate(source) {
  const template = document.createElement('span');
  const icons = visualNodes(source);
  const label = visibleLabel(source) || (!icons.length && (source.getAttribute('data-header-label') || source.getAttribute('aria-label') || source.getAttribute('title'))?.trim()) || '';
  icons.forEach((icon) => template.appendChild(icon));
  if (label) {
    const text = document.createElement('span');
    text.setAttribute('data-sleekfin-header-source-label', 'true');
    text.textContent = label;
    template.appendChild(text);
  }
  template.setAttribute('data-sleekfin-header-source-visual', icons.length ? (label ? 'icon-text' : 'icon-only') : 'text-only');
  return { label, template };
}

function rootAnchor(container) {
  if (!container) return null;

  return (
    Array.from(container.querySelectorAll('a[href]')).find((anchor) => {
      const route = routeFor(anchor);
      const url = urlFor(anchor);
      return (!url || url.origin === window.location.origin) && (route === '#/' || route === '/') && Boolean(anchor.querySelector('img, svg, [style*="background-image"]') || visibleLabel(anchor));
    }) || null
  );
}

export function discoverHeaderChrome(surface) {
  if (!surface?.header || isDashboardRoute()) return {};

  let brand = surface.header.querySelector('[data-sleekfin-header-brand]');
  let menu = null;
  if (surface.kind === 'modern') {
    const toolbar = surface.header.querySelector('.MuiToolbar-root');
    const children = toolbar ? Array.from(toolbar.children) : [];
    const navigation = children.find((element) => element.classList.contains('MuiStack-root')) || null;
    brand ||= rootAnchor(navigation) || Array.from(document.querySelectorAll('.sleekfin-header-fallback-brand')).find((element) => dom.isVisible(element)) || null;
    menu ||= children.find(isNativeMenu) || null;
  } else {
    menu ||= surface.header.querySelector('.mainDrawerButton');
    brand ||= rootAnchor(surface.header) || Array.from(document.querySelectorAll('.sleekfin-header-fallback-brand')).find((element) => dom.isVisible(element)) || null;
  }

  return Object.fromEntries(
    [
      ['brand', brand],
      ['menu', menu],
    ]
      .filter(([, source]) => Boolean(source))
      .map(([part, source]) => {
        const visual = visualTemplate(source);
        return [
          part,
          {
            kind: surface.kind,
            label: visual.label || source.getAttribute('title')?.trim() || source.getAttribute('aria-label')?.trim() || '',
            template: visual.template,
          },
        ];
      }),
  );
}

export function discoverHeaderControls(surface) {
  if (!surface?.header) return [];

  const candidates = surface.kind === 'modern' ? modernCandidates(surface.header) : legacyCandidates(surface);
  addKefinCandidates(candidates, surface);
  const records = [];
  const byKey = new Map();
  candidates.forEach((candidate) => {
    const key = keyForSource(candidate.source);
    if (!key) return;

    const existing = byKey.get(key);
    const aliases = new Set(existing?.aliases);
    if (key === 'jellyfin:more') aliases.add('kt:more');
    if (key.startsWith('kt:') || (key.startsWith('source:v1:') || key === 'jellyfin:home') && candidate.source.matches('a[href]')) {
      const route = candidate.source.matches('a[href]') ? routeFor(candidate.source) : '';
      const previousKey = `source:v1:${digest(genericIdentity(candidate.source, route))}`;
      if (previousKey !== key) aliases.add(previousKey);
    }
    if (CONDITIONAL_VIEW_IDS.has(key)) {
      const route = routeFor(candidate.source);
      const viewId = libraryId(candidate.source, route);
      aliases.add(viewId ? `jellyfin:view:${viewId}` : `source:v1:${digest(genericIdentity(candidate.source, route))}`);
    }
    const headerSources = [...(existing?.headerSources || []), ...(candidate.fallback ? [] : [candidate.source])];
    if (existing && candidateScore(existing) >= candidateScore(candidate)) {
      existing.aliases = [...aliases];
      existing.headerSources = headerSources;
      return;
    }

    const visual = visualTemplate(candidate.source);
    const record = {
      aliases: [...aliases],
      caption: captionFor(key, candidate.source, visual.label),
      fallback: candidate.fallback,
      headerSources,
      inline: sourceInline(candidate),
      key,
      label: visual.label || fallbackLabel(key, candidate.source),
      nativeHidden: sourceNativeHidden(candidate.source),
      popup: sourceOpensPopup(key, candidate.source),
      separate: candidate.separate,
      source: candidate.source,
      template: visual.template,
    };
    record.current = currentSource(record);
    if (existing) {
      const index = records.indexOf(existing);
      records[index] = record;
    } else {
      records.push(record);
    }
    byKey.set(key, record);
  });
  const home = byKey.get('jellyfin:home');
  if (!home || home.nativeHidden) {
    const record = { caption: 'Home', current: false, fallback: true, inline: false, key: 'jellyfin:home', label: 'Home', nativeHidden: false, popup: false, source: HOME_SOURCE, template: visualTemplate(HOME_SOURCE).template };
    if (home) records[records.indexOf(home)] = record;
    else records.push(record);
  }
  const aliases = records.reduce((values, record) => values.concat(record.aliases || []), []);
  records.forEach((record) => {
    if (record.aliases) record.aliases = record.aliases.filter((alias) => aliases.indexOf(alias) === aliases.lastIndexOf(alias));
  });
  return records;
}

export function catalogDescriptors(records) {
  const descriptors = records.map((record) => ({
    aliases: Array.isArray(record.aliases) ? record.aliases : [],
    available: !record.nativeHidden,
    caption: LABELS[record.label] || record.caption,
    current: record.current,
    id: record.key,
    inline: record.inline,
    label: LABELS[record.label] || record.label,
    shape: record.template.getAttribute('data-sleekfin-header-source-visual'),
  }));
  const kefin = window.KefinTweaksConfig;
  const defaultHomeSettings = window.KefinHomeConfig2?.HOME_SETTINGS;
  const homeSettings = kefin?.homeScreenConfig?.HOME_SETTINGS || defaultHomeSettings;
  const configured = homeSettings?.categories;
  const categories = Array.isArray(configured) && configured.length ? configured : defaultHomeSettings?.categories;
  const categoryFiltersEnabled = kefin?.enabled !== false && kefin?.scripts?.homeScreen !== false && homeSettings?.showCategoryFilters !== false;
  (Array.isArray(categories) ? categories : []).forEach((category) => {
    if (!category?.id) return;
    const categoryId = String(category.id);
    const id = kefinCategoryKey(categoryId);
    const existing = descriptors.find((descriptor) => descriptor.id === id);
    // The Home preview uses KefinTweaks settings because the rail hides on the dashboard.
    const available = categoryFiltersEnabled && (categoryId !== 'pinned' || existing?.available === true);
    if (existing) {
      existing.available = available;
      return;
    }
    const label = String(category.name || categoryId);
    descriptors.push({ aliases: [], available, caption: `KefinTweaks ${label}`, current: false, id, inline: false, label, shape: 'text-only' });
  });
  const links = window.KefinTweaksConfig?.customMenuLinks;
  (Array.isArray(links) ? links : []).forEach((link) => {
    const label = String(link?.name || '').trim();
    const target = String(link?.url || '').trim() || (link?.action ? `action:${String(link.action).trim()}` : '');
    if (!label || !target) return;
    const id = kefinLinkKey(`${label}||${target}`);
    if (!descriptors.some((descriptor) => descriptor.id === id)) descriptors.push({ aliases: [], available: false, caption: `KefinTweaks ${label}`, current: false, id, inline: false, label, shape: 'text-only' });
  });
  return descriptors;
}

export function cloneSourceTemplate(template) {
  const clone = template.cloneNode(true);
  namespaceSvgIds(clone);
  return clone;
}

export function cloneCatalogTemplate(records, key) {
  const template = records.find((record) => record.key === key)?.template || (key === 'jellyfin:home' ? visualTemplate(HOME_SOURCE).template : null);
  return template ? cloneSourceTemplate(template) : null;
}

export function cloneChromeTemplate(chrome, part) {
  const template = part === 'brand' || part === 'menu' ? chrome[part]?.template : null;
  return template ? cloneSourceTemplate(template) : null;
}

export function chromeSignature(chrome) {
  return ['brand', 'menu'].map((part) => `${part}|${chrome[part]?.kind || ''}|${chrome[part]?.label || ''}|${chrome[part]?.template.outerHTML || ''}`).join('\n');
}

export function catalogSignature(records) {
  return records.map((record) => `${record.key}|${record.caption}|${record.current}|${record.inline}|${record.nativeHidden}|${record.aliases?.join(',')}|${record.template.outerHTML}`).join('\n');
}

export function legacyAlias(key, records) {
  const match = records.find((record) => record.aliases?.includes(key));
  if (match) return match;
  if (key.startsWith('source:v1:')) {
    return records.find((record) => ['jellyfin:home', 'jellyfin:favorites'].includes(record.key) && key === `source:v1:${digest(genericIdentity(record.source, ''))}`) || null;
  }
  if (key !== 'jellyfin:movies' && key !== 'jellyfin:shows') return null;
  const pattern = key === 'jellyfin:movies' ? /(?:#\/movies|collectiontype=movies)/ : /(?:#\/tv|collectiontype=tvshows)/;
  return records.find((record) => record.source.matches('a[href]') && pattern.test(routeFor(record.source))) || null;
}

export function currentSource(record) {
  if (record.source.hasAttribute('data-kefin-custom-menu-top-right')) return false;
  if (record.key.startsWith('kt:') || kefinKey(record.source)) return record.source.classList.contains('is-active') || record.source.classList.contains('active') || record.source.getAttribute('aria-pressed') === 'true';
  if (record.key === 'jellyfin:home') return /^#\/(?:home(?:\.html)?)?(?:\?tab=0)?$/.test(window.location.hash.toLowerCase());
  if (record.key === 'jellyfin:search') return /#?\/search(?:[?/#]|$)/.test((window.location.hash || window.location.pathname).toLowerCase());
  if (record.key === 'jellyfin:favorites') return /[?&]tab=1(?:&|$)/.test((window.location.hash || '').toLowerCase());
  if (record.key.startsWith('sf:')) return new RegExp(`[?&]seerrfintab=${record.key.slice(3)}(?:&|$)`).test((window.location.hash || '').toLowerCase());
  if (record.key.startsWith('je:')) {
    const id = record.key.slice(3);
    const button = document.getElementById(`je-native-tab-btn-${id}`);
    const index = button?.getAttribute('data-index');
    return Boolean(button?.classList.contains('emby-tab-button-active') || (index && new RegExp(`[?&]tab=${index}(?:&|$)`).test((window.location.hash || '').toLowerCase())));
  }
  if (record.source.matches('a[href]')) {
    const route = routeFor(record.source);
    const url = urlFor(record.source);
    if (url && url.origin !== window.location.origin) return false;
    return Boolean(route && (window.location.href.toLowerCase().includes(route) || record.source.getAttribute('aria-current') === 'page'));
  }
  return record.source.classList.contains('emby-tab-button-active') || record.source.getAttribute('data-sleekfin-current') === 'true';
}

export function refreshRecordVisual(record) {
  const visual = visualTemplate(record.source);
  const signature = visual.template.outerHTML;
  const preserveShape =
    !record.key.startsWith('kt:') &&
    (record.source.hasAttribute('data-sleekfin-header-source-hidden') || record.source.hasAttribute('data-sleekfin-header-source-anchor')) &&
    visual.template.getAttribute('data-sleekfin-header-source-visual') !== record.template.getAttribute('data-sleekfin-header-source-visual');
  const changed = !preserveShape && signature !== record.template.outerHTML;
  record.caption = captionFor(record.key, record.source, visual.label);
  record.nativeHidden = sourceNativeHidden(record.source);
  if (!preserveShape) record.template = visual.template;
  return changed;
}
