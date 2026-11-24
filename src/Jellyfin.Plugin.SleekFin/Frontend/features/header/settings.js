const FIXED_ITEM_IDS = new Set([
  'space',
  'jellyfin:movies',
  'jellyfin:shows',
  'jellyfin:audio-player',
  'jellyfin:back',
  'jellyfin:cast',
  'jellyfin:collections',
  'jellyfin:favorites',
  'jellyfin:folders',
  'jellyfin:home',
  'jellyfin:live-tv',
  'jellyfin:more',
  'jellyfin:playlists',
  'jellyfin:search',
  'jellyfin:syncplay',
  'jellyfin:user-menu',
  'separator',
]);
const PLUGIN_ITEM_PATTERN = /^(?:je|sf|kt):[a-z0-9-]{1,64}$/;
const JELLYFIN_VIEW_PATTERN = /^jellyfin:view:[\da-f-]{16,64}$/;
const SOURCE_ITEM_PATTERN = /^source:v1:[\da-f]{32}$/;
const POSITIONS = new Set(['Left', 'Center', 'Right']);
const BRAND_DISPLAYS = new Set(['None', 'Logo', 'ServerName', 'Both']);

export const DEFAULT_SETTINGS = Object.freeze({
  barPosition: 'Right',
  brandDisplay: 'Both',
  brandPosition: 'Left',
  enabled: true,
  hiddenItems: [],
  itemOrder: [],
  styles: null,
});

function option(value, values, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return values.has(candidate) ? candidate : fallback;
}

export function isItemId(id) {
  return FIXED_ITEM_IDS.has(id) || PLUGIN_ITEM_PATTERN.test(id) || JELLYFIN_VIEW_PATTERN.test(id) || SOURCE_ITEM_PATTERN.test(id);
}

function itemIds(value, preserveDuplicates = false) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return items.reduce((result, item) => {
    const candidate = String(item || '').trim().toLowerCase();
    if (isItemId(candidate) && (preserveDuplicates || !seen.has(candidate))) {
      if (!preserveDuplicates) seen.add(candidate);
      result.push(candidate);
    }
    return result;
  }, []);
}

export function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const hiddenItems = itemIds(source.hiddenItems);
  const hiddenItemIds = new Set(hiddenItems);
  return {
    barPosition: option(source.barPosition, POSITIONS, DEFAULT_SETTINGS.barPosition),
    brandDisplay: option(source.brandDisplay, BRAND_DISPLAYS, DEFAULT_SETTINGS.brandDisplay),
    brandPosition: option(source.brandPosition, POSITIONS, DEFAULT_SETTINGS.brandPosition),
    enabled: source.enabled !== false,
    hiddenItems,
    itemOrder: itemIds(source.itemOrder, true).filter((item) => !hiddenItemIds.has(item)),
    styles: Array.isArray(source.styles) && source.styles.length === 3 && source.styles.every((css) => typeof css === 'string') ? source.styles : DEFAULT_SETTINGS.styles,
  };
}

export function settingsSignature(settings) {
  return JSON.stringify(settings);
}