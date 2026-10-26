import { setIcon } from '../../components/Icon.jsx';

const CACHE_KEY = 'sleekfin-details-action-catalog';
const MEDIA_TYPES = ['Movie', 'Series', 'Season', 'Episode'];
const OTHER_MEDIA_ACTIONS = new Set(['native:btnInstantMix', 'native:btnCancelTimer', 'native:btnCancelSeriesTimer']);
const providerAvailability = new Map();
let tagRules = null;
const NATIVE = [
  ['play', 'Play', 'btnPlay', 'play_arrow'],
  ['replay', 'Start from beginning', 'btnReplay', 'replay'],
  ['download', 'Download', 'btnDownload', 'get_app'],
  ['favorite', 'Favorite', 'btnUserRating', 'favorite'],
  ['trailer', 'Trailer', 'btnPlayTrailer', 'theaters'],
  ['shuffle', 'Shuffle', 'btnShuffle', 'shuffle'],
  ['watched', 'Watched', 'btnPlaystate', 'check'],
  ['info', 'Info', 'sleekfin-details-track-settings', 'info_outline'],
  ['more', 'More', 'btnMoreCommands', 'more_vert'],
  ['splitVersions', 'Split versions apart', 'btnSplitVersions', 'call_split'],
];
const PROVIDERS = [
  ['je:letterboxd', 'Letterboxd', 'letterboxd-link', 'letterboxd.svg'],
  ['je:seerr', 'Seerr', 'seerr-link', 'seerr.svg'],
  ['je:radarr', 'Radarr', 'arr-link', 'radarr-light-hybrid-light.svg'],
  ['je:sonarr', 'Sonarr', 'arr-link', 'sonarr.svg'],
  ['je:bazarr', 'Bazarr', 'arr-link', 'bazarr.svg'],
  ['je:hide', 'Hide', 'je-detail-hide-btn', 'visibility'],
  ['je:spoiler', 'Spoiler Guard', 'je-spoiler-blur-btn', 'blur_on'],
  ['je:report', 'Report issue', 'jellyseerr-report-issue-icon', 'warning'],
  ['je:request-more', 'Request More', 'je-series-request-more-btn', 'download'],
];

function currentScope() {
  try {
    const api = window.ApiClient;
    const server = api?.serverId?.() || api?.serverInfo?.()?.Id;
    const user = api?.getCurrentUserId?.();
    return server && user ? `${server}:${user}` : '';
  } catch { return ''; }
}

function safeImage(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  try {
    const url = new URL(value, document.baseURI);
    return /^https?:$/.test(url.protocol) && !url.username && !url.password && ![...url.searchParams.keys()].some((key) => /token|api.?key|password|secret/i.test(key)) ? url.href : '';
  } catch { return ''; }
}

function cleanVisual(source) {
  if (!source) return null;
  const allowed = new Set(['svg', 'span', 'img', 'path', 'polygon', 'polyline', 'line', 'rect', 'circle', 'ellipse', 'g', 'defs', 'lineargradient', 'radialgradient', 'stop', 'mask', 'clippath', 'title']);
  if (!allowed.has(source.tagName.toLowerCase())) return null;
  const visual = source.cloneNode(true);
  visual.querySelectorAll('*').forEach((node) => { if (!allowed.has(node.tagName.toLowerCase())) node.remove(); });
  if (visual.tagName.toLowerCase() === 'img' && !safeImage(visual.getAttribute('src'))) return null;
  [visual, ...visual.querySelectorAll('*')].forEach((node) => {
    [...node.attributes].forEach(({ name }) => {
      if (/^on/i.test(name) || ['id', 'style', 'href', 'xlink:href', 'srcset'].includes(name) || name.startsWith('data-')) node.removeAttribute(name);
    });
    if (node.tagName.toLowerCase() === 'img') {
      const src = safeImage(node.getAttribute('src'));
      if (src) node.setAttribute('src', src);
      else node.remove();
    }
  });
  return visual;
}

function readCache() {
  const scope = currentScope();
  try {
    const cache = JSON.parse(window.sessionStorage.getItem(CACHE_KEY) || 'null');
    return { scope, records: new Map(scope && cache?.scope === scope && Array.isArray(cache.records) ? cache.records.slice(0, 128).filter((entry) => entry?.id && typeof entry.label === 'string').map((entry) => [entry.id, entry]) : []) };
  } catch { return { scope, records: new Map() }; }
}

let state = readCache();

function scopedState() {
  const cached = readCache();
  if (cached.scope !== state.scope || cached.scope) state = cached;
  return state;
}

export function identifyAction(control) {
  const native = NATIVE.find((entry) => control.classList.contains(entry[2]));
  if (native) return native[0];
  if (control.matches('.arr-tag-link')) return `je:tag:${encodeURIComponent(control.dataset.tag || control.dataset.tagName || control.textContent.trim())}`;
  const provider = PROVIDERS.find((entry) => entry[2] !== 'arr-link' && control.classList.contains(entry[2]));
  if (provider) return provider[0];
  if (control.matches('.jellyseerr-report-unavailable-icon')) return 'je:report';
  if (control.matches('.arr-link')) {
    const name = `${control.querySelector('img')?.alt || ''} ${control.title} ${control.textContent}`;
    const match = name.match(/\b(Radarr|Sonarr|Bazarr)\b/i);
    if (match) return `je:${match[1].toLowerCase()}`;
  }
  const name = [...control.classList].find((value) => /^btn[A-Z]/.test(value));
  return name ? `native:${name}` : '';
}

export function actionLabel(control, id = identifyAction(control)) {
  const label = control.title || control.getAttribute('aria-label') || control.querySelector('.sleekfin-button-label, .detailButton-icon-text, .arr-tag-link-text')?.textContent.trim() || NATIVE.find((entry) => entry[0] === id)?.[1] || PROVIDERS.find((entry) => entry[0] === id)?.[1];
  if (label) return label;
  const content = control.cloneNode(true);
  content.querySelectorAll('.material-icons, svg, .sleekfin-details-action-label').forEach((node) => node.remove());
  return content.textContent.trim() || id;
}

function captureVisual(control, id) {
  const source = control.querySelector('.sleekfin-icon') || control.querySelector('img, .material-icons, svg');
  const visual = cleanVisual(source);
  if (visual) return visual.outerHTML;
  const definition = PROVIDERS.find((entry) => entry[0] === id);
  if (definition?.[3].endsWith('.svg')) {
    const url = window.JellyfinEnhanced?.cdn?.selfhst?.(`svg/${definition[3]}`);
    if (safeImage(url)) {
      const image = document.createElement('img');
      image.src = url;
      image.alt = definition[1];
      return image.outerHTML;
    }
  }
  return '';
}

export function publishActionCatalog(records, mediaType, itemId) {
  const { records: catalog, scope } = scopedState();
  let changed = false;
  records.forEach(({ control, id, available }) => {
    const previous = catalog.get(id);
    const label = actionLabel(control, id);
    const state = id === 'favorite' ? control.getAttribute('data-isfavorite') === 'true' || control.classList.contains('ratingbutton-withrating') : id === 'watched' ? control.getAttribute('data-played') === 'true' || control.classList.contains('playstatebutton-played') : null;
    const labels = state === null ? previous?.labels : { ...previous?.labels, [String(state)]: label };
    const entry = { id, label, labels, provider: id.startsWith('je:') ? 'Jellyfin Enhanced' : 'Jellyfin', visual: captureVisual(control, id), itemId: String(itemId || ''), mediaType: mediaType || '', available: Boolean(available) };
    if (JSON.stringify(previous) !== JSON.stringify(entry)) {
      catalog.set(id, entry);
      changed = true;
    }
  });
  if (!changed) return;
  try { if (scope) window.sessionStorage.setItem(CACHE_KEY, JSON.stringify({ scope, records: [...catalog.values()] })); } catch { /* Session storage can be unavailable in embedded clients. */ }
  window.dispatchEvent(new CustomEvent('sleekfin:details-actions-changed'));
}

function nativeAvailable(id, item) {
  if (!item) return !['replay', 'splitVersions'].includes(id);
  if (id === 'play') return ['Series', 'Season'].includes(item.Type) || item.LocationType !== 'Virtual';
  if (id === 'replay') return nativeAvailable('play', item) && Number(item.UserData?.PlaybackPositionTicks) > 0;
  if (id === 'download') return ['Movie', 'Episode'].includes(item.Type) && item.CanDownload === true && (!window.NativeShell || window.NativeShell.AppHost.supports('filedownload'));
  if (id === 'favorite') return Boolean(item.UserData);
  if (id === 'watched') return item.MediaType === 'Video' || ['Series', 'Season'].includes(item.Type);
  if (id === 'shuffle') return ['Series', 'Season'].includes(item.Type);
  if (id === 'trailer') return Boolean(item.LocalTrailerCount || item.RemoteTrailers?.length);
  if (id === 'splitVersions') return Boolean(item.MediaSources?.some((source) => source.Type === 'Grouping'));
  return true;
}

function providerAvailable(id, item) {
  const je = window.JellyfinEnhanced;
  const config = je?.pluginConfig;
  if (!config) return false;
  if (id === 'je:letterboxd') return config.LetterboxdEnabled === true && (!item || item.Type === 'Movie');
  if (id === 'je:seerr') return config.JellyseerrEnabled === true && config.JellyseerrShowDetailPageLink === true && (!item || ['Movie', 'Series'].includes(item.Type));
  if (id === 'je:report') return config.JellyseerrEnabled === true && config.JellyseerrShowReportButton === true;
  if (id === 'je:request-more') return config.JellyseerrEnabled === true && config.JellyseerrShowRequestMoreOnSeries !== false && item?.Type === 'Series';
  if (id === 'je:spoiler') return config.SpoilerBlurEnabled === true;
  if (id.startsWith('je:tag:')) return config.ArrTagsShowAsLinks === true;
  if (id === 'je:hide') {
    const settings = je.hiddenContent?.getSettings?.();
    return Boolean(settings?.enabled && settings.showHideButtons && settings.showButtonDetails !== false);
  }
  if (['je:radarr', 'je:sonarr', 'je:bazarr'].includes(id)) {
    const name = { 'je:radarr': 'Radarr', 'je:sonarr': 'Sonarr', 'je:bazarr': 'Bazarr' }[id];
    const typeMatches = !item || (id === 'je:radarr' ? item.Type === 'Movie' : id === 'je:sonarr' ? item.Type === 'Series' : ['Movie', 'Series'].includes(item.Type));
    return config.ArrLinksEnabled === true && Boolean(config[`${name}Url`] || config[`${name}Instances`]?.some((entry) => entry?.Enabled !== false)) && typeMatches;
  }
  return false;
}

function providerDisabled(id) {
  const config = window.JellyfinEnhanced?.pluginConfig || {};
  if (id === 'je:hide') {
    const settings = window.JellyfinEnhanced?.hiddenContent?.getSettings?.();
    return Boolean(settings && (!settings.enabled || !settings.showHideButtons || settings.showButtonDetails === false));
  }
  if (id.startsWith('je:tag:')) return config.ArrTagsShowAsLinks === false;
  const flags = {
    'je:letterboxd': ['LetterboxdEnabled'],
    'je:seerr': ['JellyseerrEnabled', 'JellyseerrShowDetailPageLink'],
    'je:report': ['JellyseerrEnabled', 'JellyseerrShowReportButton'],
    'je:request-more': ['JellyseerrEnabled', 'JellyseerrShowRequestMoreOnSeries'],
    'je:spoiler': ['SpoilerBlurEnabled'],
    'je:radarr': ['ArrLinksEnabled'], 'je:sonarr': ['ArrLinksEnabled'], 'je:bazarr': ['ArrLinksEnabled'],
  };
  return flags[id]?.some((flag) => config[flag] === false) || false;
}

function providerMatchesItem(id, item) {
  if (!item) return true;
  if (id.startsWith('je:tag:')) {
    let tag;
    try { tag = decodeURIComponent(id.slice('je:tag:'.length)); } catch { return false; }
    const config = window.JellyfinEnhanced?.pluginConfig;
    const prefix = (tagRules?.prefix ?? config?.ArrTagsPrefix) || 'JE Arr Tag: ';
    const allowed = (tagRules?.allowed ?? config?.ArrTagsLinksFilter ?? '').split('\n').map((value) => value.trim()).filter(Boolean).map((value) => `${prefix}${value}`.toLowerCase());
    const hidden = (tagRules?.hidden ?? config?.ArrTagsLinksHideFilter ?? '').split('\n').map((value) => value.trim()).filter(Boolean).map((value) => `${prefix}${value}`.toLowerCase());
    const present = Array.isArray(item.Tags) ? item.Tags.includes(tag) : !item.Id;
    return present && tag.startsWith(prefix) && !hidden.includes(tag.toLowerCase()) && (!allowed.length || allowed.includes(tag.toLowerCase()));
  }
  const types = { 'je:letterboxd': ['Movie'], 'je:seerr': ['Movie', 'Series'], 'je:radarr': ['Movie'], 'je:sonarr': ['Series'], 'je:bazarr': ['Movie', 'Series'], 'je:request-more': ['Series'] };
  if (types[id] && !types[id].includes(item.Type)) return false;
  const fullItem = item.Id || item.ProviderIds !== undefined || item.ExternalUrls !== undefined;
  if (!fullItem) return true;
  const tmdb = item.ProviderIds?.Tmdb;
  const urls = (item.ExternalUrls || []).map((entry) => entry.Url || '');
  const tmdbLink = Boolean(tmdb || urls.some((url) => /themoviedb\.org\/(movie|tv)\//.test(url)));
  const tmdbNumber = /^\d+$/.test(String(tmdb || '')) || urls.some((url) => /themoviedb\.org\/(movie|tv)\/\d+/.test(url));
  if (id === 'je:letterboxd') return Boolean(item.ProviderIds?.Imdb);
  if (id === 'je:seerr' || id === 'je:radarr') return tmdbNumber;
  if (id === 'je:sonarr' || id === 'je:bazarr') return tmdbLink && (id !== 'je:sonarr' || Boolean(item.Name));
  if (id === 'je:request-more') return Boolean(parseInt(tmdb, 10));
  if (id === 'je:report') {
    if (item.Type === 'Season' && !Number(item.IndexNumber || item.SeasonNumber || item.Index || 0)) return false;
    if (item.Type === 'Episode' && !Number(item.ParentIndexNumber || item.SeasonIndex || item.ParentIndex || item.SeasonNumber || 0)) return false;
    return Boolean(tmdb || ['Season', 'Episode'].includes(item.Type) && (item.SeriesId || item.ParentId || item.Series?.Id));
  }
  return true;
}

export function getActionCatalog(item = null, actionIds = []) {
  const type = typeof item === 'string' ? item : item?.Type;
  const mediaItem = typeof item === 'string' ? { Type: item } : item;
  const captured = scopedState().records;
  const definitions = [...NATIVE.map(([id, label]) => ({ id, label, provider: 'Jellyfin' })), ...PROVIDERS.map(([id, label]) => ({ id, label, provider: 'Jellyfin Enhanced' }))];
  captured.forEach((entry, id) => {
    if (OTHER_MEDIA_ACTIONS.has(id)) {
      if (actionIds.includes(id)) definitions.push({ ...entry, provider: 'Unavailable action' });
    } else if (!definitions.some((definition) => definition.id === id)) definitions.push(entry);
  });
  actionIds.forEach((id) => { if (!definitions.some((definition) => definition.id === id)) definitions.push({ id, label: id, provider: 'Unavailable action' }); });
  return definitions.map((definition) => {
    const entry = captured.get(definition.id);
    const native = NATIVE.some(([id]) => id === definition.id);
    const fullSample = item && typeof item === 'object';
    const providerTypes = providerAvailability.get(definition.id) || (definition.id.startsWith('je:tag:') ? providerAvailability.get('je:tag:*') : undefined);
    const providerEnabled = providerTypes ? providerTypes.length > 0 && (!type || providerTypes.includes(type)) : providerAvailable(definition.id, mediaItem);
    const explicitlyDisabled = providerTypes && !providerEnabled || providerDisabled(definition.id) || !providerMatchesItem(definition.id, mediaItem);
    const capturedHere = mediaItem?.Id && entry?.itemId === String(mediaItem.Id) && entry.mediaType === type ? entry.available : undefined;
    const available = definition.provider === 'Unavailable action' || explicitlyDisabled ? false : fullSample && native ? nativeAvailable(definition.id, mediaItem) : capturedHere ?? (definition.id.startsWith('je:') ? providerEnabled : native && nativeAvailable(definition.id, mediaItem));
    let label = entry?.label || definition.label;
    if (mediaItem?.UserData) {
      if (definition.id === 'play') label = mediaItem.UserData.PlaybackPositionTicks > 0 ? 'Resume' : 'Play';
      if (definition.id === 'favorite') label = entry?.labels?.[String(Boolean(mediaItem.UserData.IsFavorite))] || (mediaItem.UserData.IsFavorite ? 'Favorite' : 'Add to favorites');
      if (definition.id === 'watched') label = entry?.labels?.[String(Boolean(mediaItem.UserData.Played))] || (mediaItem.UserData.Played ? 'Watched' : 'Mark played');
    }
    return { id: definition.id, label, provider: definition.provider, available };
  });
}

export function createActionPreview(id, item = null) {
  const descriptor = getActionCatalog(item, [id]).find((entry) => entry.id === id);
  const definition = [...NATIVE, ...PROVIDERS].find((entry) => entry[0] === id);
  const button = document.createElement('button');
  button.type = 'button';
  button.title = descriptor.label;
  button.className = `detailButton emby-button ${definition?.[2] || ''} sleekfin-details-action-control`;
  button.dataset.sleekfinActionId = id;
  button.dataset.sleekfinActionAvailable = String(descriptor.available);
  if (id === 'favorite' && item?.UserData?.IsFavorite) {
    button.classList.add('ratingbutton-withrating');
    button.dataset.isfavorite = 'true';
  }
  if (id === 'watched' && item?.UserData?.Played) button.classList.add('playstatebutton-played');
  if (id.startsWith('je:')) button.classList.add('sleekfin-details-enhanced-action', 'sleekfin-control-3d');
  const content = document.createElement('span');
  content.className = 'detailButton-content';
  button.appendChild(content);
  const visual = scopedState().records.get(id)?.visual;
  if (visual) {
    const holder = document.createElement('template');
    holder.innerHTML = visual;
    const clone = cleanVisual(holder.content.firstElementChild);
    if (clone) content.appendChild(clone);
  }
  if (!content.firstChild) {
    const asset = definition?.[3];
    if (asset?.endsWith('.svg')) {
      const url = window.JellyfinEnhanced?.cdn?.selfhst?.(`svg/${asset}`);
      if (safeImage(url)) { const image = document.createElement('img'); image.src = url; image.alt = descriptor.label; content.appendChild(image); }
    } else if (asset) {
      const icon = document.createElement('span');
      icon.className = `material-icons ${asset}`;
      content.appendChild(icon);
    }
    if (id === 'play' || id === 'download') { content.textContent = ''; setIcon(content, id); }
  }
  const label = document.createElement('span');
  label.className = ['play', 'replay', 'download', 'favorite'].includes(id) ? 'sleekfin-button-label' : 'sleekfin-details-action-label';
  label.textContent = descriptor.label;
  content.appendChild(label);
  if (['play', 'replay', 'download', 'favorite'].includes(id)) {
    button.classList.add('sleekfin-button', id === 'play' ? 'sleekfin-button-primary' : 'sleekfin-button-control');
    content.classList.add('sleekfin-button-content');
  }
  if (id !== 'play') button.classList.add('sleekfin-control-3d');
  const material = button.querySelector('.material-icons');
  if (material && item?.UserData) {
    if (id === 'favorite') material.classList.toggle('ratingbutton-icon-withrating', Boolean(item.UserData.IsFavorite));
    if (id === 'watched') {
      material.classList.toggle('playstatebutton-icon-played', Boolean(item.UserData.Played));
      material.classList.toggle('playstatebutton-icon-unplayed', !item.UserData.Played);
    }
  }
  return button;
}

export function setProviderAvailability(values) {
  providerAvailability.clear();
  PROVIDERS.forEach(([id]) => {
    if (Array.isArray(values?.[id])) providerAvailability.set(id, values[id].filter((type) => MEDIA_TYPES.includes(type)));
  });
  if (Array.isArray(values?.['je:tag:*'])) providerAvailability.set('je:tag:*', values['je:tag:*'].filter((type) => MEDIA_TYPES.includes(type)));
  tagRules = values?.tagRules ? Object.fromEntries(['prefix', 'allowed', 'hidden'].filter((key) => typeof values.tagRules[key] === 'string').map((key) => [key, values.tagRules[key]])) : null;
  window.dispatchEvent(new CustomEvent('sleekfin:details-actions-changed'));
}
