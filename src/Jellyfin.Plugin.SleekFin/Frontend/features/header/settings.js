const FIXED_ITEM_IDS = new Set([
  'space',
  'jellyfin:movies',
  'jellyfin:shows',
  'jellyfin:audio-player',
  'jellyfin:back',
  'jellyfin:cast',
  'jellyfin:favorites',
  'jellyfin:home',
  'jellyfin:more',
  'jellyfin:search',
  'jellyfin:syncplay',
  'jellyfin:user-menu',
  'separator',
]);
const PLUGIN_ITEM_PATTERN = /^(?:je|sf):[a-z0-9-]{1,64}$/;
const JELLYFIN_VIEW_PATTERN = /^jellyfin:view:[\da-f-]{16,64}$/;
const SOURCE_ITEM_PATTERN = /^source:v1:[\da-f]{32}$/;
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
const RGBA_COLOR_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i;
const POSITIONS = new Set(['Left', 'Center', 'Right']);
const BRAND_DISPLAYS = new Set(['None', 'Logo', 'ServerName', 'Both']);

export const DEFAULT_SETTINGS = Object.freeze({
  activeItemBackgroundColor: 'rgba(255, 255, 255, 0.12)',
  activeItemOpacity: 100,
  activeItemTextColor: '#FFFFFF',
  barPadding: 4,
  barPosition: 'Right',
  brandDisplay: 'Both',
  brandPosition: 'Left',
  brandSpacing: 10,
  enabled: true,
  height: 80,
  hoverOpacity: 100,
  itemBackgroundColor: 'transparent',
  itemHeight: 32,
  hiddenItems: [],
  itemOrder: [],
  itemSpacing: 2,
  itemTextColor: 'rgba(255, 255, 255, 0.7)',
  logoHeight: 36,
  serverNameColor: '#FFFFFF',
});

function number(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}

function option(value, values, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return values.has(candidate) ? candidate : fallback;
}

function color(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.toLowerCase() === 'transparent' || HEX_COLOR_PATTERN.test(candidate)) return candidate;

  const match = RGB_COLOR_PATTERN.exec(candidate) || RGBA_COLOR_PATTERN.exec(candidate);
  if (!match || match.slice(1, 4).some((component) => Number(component) > 255)) return fallback;
  return candidate;
}

function itemIds(value, preserveDuplicates = false) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return items.reduce((result, item) => {
    const candidate = String(item || '').trim().toLowerCase();
    const valid = FIXED_ITEM_IDS.has(candidate) || PLUGIN_ITEM_PATTERN.test(candidate) || JELLYFIN_VIEW_PATTERN.test(candidate) || SOURCE_ITEM_PATTERN.test(candidate);
    if (valid && (preserveDuplicates || !seen.has(candidate))) {
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
  const settings = {
    activeItemBackgroundColor: color(source.activeItemBackgroundColor, DEFAULT_SETTINGS.activeItemBackgroundColor),
    activeItemOpacity: number(source.activeItemOpacity, 0, 100, DEFAULT_SETTINGS.activeItemOpacity),
    activeItemTextColor: color(source.activeItemTextColor, DEFAULT_SETTINGS.activeItemTextColor),
    barPadding: number(source.barPadding, 0, 32, DEFAULT_SETTINGS.barPadding),
    barPosition: option(source.barPosition, POSITIONS, DEFAULT_SETTINGS.barPosition),
    brandDisplay: option(source.brandDisplay, BRAND_DISPLAYS, DEFAULT_SETTINGS.brandDisplay),
    brandPosition: option(source.brandPosition, POSITIONS, DEFAULT_SETTINGS.brandPosition),
    brandSpacing: number(source.brandSpacing, 0, 64, DEFAULT_SETTINGS.brandSpacing),
    enabled: source.enabled !== false,
    height: number(source.height, 48, 160, DEFAULT_SETTINGS.height),
    hiddenItems,
    hoverOpacity: number(source.hoverOpacity, 0, 100, DEFAULT_SETTINGS.hoverOpacity),
    itemBackgroundColor: color(source.itemBackgroundColor, DEFAULT_SETTINGS.itemBackgroundColor),
    itemHeight: number(source.itemHeight, 24, 80, DEFAULT_SETTINGS.itemHeight),
    itemOrder: itemIds(source.itemOrder, true).filter((item) => !hiddenItemIds.has(item)),
    itemSpacing: number(source.itemSpacing, 0, 48, DEFAULT_SETTINGS.itemSpacing),
    itemTextColor: color(source.itemTextColor, DEFAULT_SETTINGS.itemTextColor),
    logoHeight: number(source.logoHeight, 16, 96, DEFAULT_SETTINGS.logoHeight),
    serverNameColor: color(source.serverNameColor, DEFAULT_SETTINGS.serverNameColor),
  };
  settings.logoHeight = Math.min(settings.logoHeight, settings.height);
  settings.itemHeight = Math.min(settings.itemHeight, settings.height);
  settings.barPadding = Math.min(settings.barPadding, Math.floor((settings.height - settings.itemHeight) / 2));
  return settings;
}

export function settingsSignature(settings) {
  return JSON.stringify(settings);
}