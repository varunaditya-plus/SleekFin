const CONTENT_SOURCES = ['ContinueWatching', 'NextUp', 'LatestMovies', 'LatestShows', 'Favorites'];
const CONTENT_ALIGNMENTS = ['Left', 'Center', 'Right'];
const VERTICAL_ALIGNMENTS = ['Top', 'Center', 'Bottom'];
const TITLE_TREATMENTS = ['Auto', 'Logo', 'Text'];
const BACKDROP_FITS = ['Cover', 'Contain'];
const TITLE_CASES = ['Original', 'Uppercase'];
const TITLE_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
const BUTTON_CORNER_STYLES = ['Square', 'Rounded', 'Pill'];
const TRANSITION_STYLES = ['Slide', 'Fade', 'SlideFade'];
const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i;
const RGBA_COLOR_PATTERN = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i;

const DEFAULT_SETTINGS = Object.freeze({
  autoRotateSeconds: 10,
  backdropFit: 'Cover',
  backdropFocusX: 50,
  backdropFocusY: 28,
  backdropOpacity: 100,
  buttonCornerStyle: 'Pill',
  buttonHeight: 44,
  contentAlignment: 'Left',
  contentMaxWidth: 560,
  contentOrder: CONTENT_SOURCES,
  descriptionColor: 'rgba(255, 255, 255, 0.88)',
  descriptionLines: 3,
  descriptionSize: 15,
  descriptionWeight: 400,
  desktopHeight: 85,
  enabled: true,
  mobileHeight: 70,
  primaryButtonBackgroundColor: '#F1F2F4',
  primaryButtonOpacity: 100,
  primaryButtonTextColor: '#05070A',
  randomized: false,
  secondaryButtonBackgroundColor: '#161618',
  secondaryButtonOpacity: 82,
  secondaryButtonTextColor: '#F1F2F4',
  slidesShown: 5,
  swipeEnabled: true,
  titleCase: 'Uppercase',
  titleColor: '#FFFFFF',
  titleSize: 48,
  titleTreatment: 'Auto',
  titleWeight: 800,
  transitionDurationMs: 380,
  transitionStyle: 'SlideFade',
  verticalAlignment: 'Bottom',
  vignetteStrength: 72,
});

function number(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, Math.round(parsed))) : fallback;
}

function option(value, values, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return values.find((entry) => entry.toLowerCase() === candidate.toLowerCase()) || fallback;
}

function color(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (candidate.toLowerCase() === 'transparent' || HEX_COLOR_PATTERN.test(candidate)) return candidate;

  const match = RGB_COLOR_PATTERN.exec(candidate) || RGBA_COLOR_PATTERN.exec(candidate);
  if (!match || match.slice(1, 4).some((component) => Number(component) > 255)) return fallback;
  return candidate;
}

function contentOrder(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : CONTENT_SOURCES;
  const seen = new Set();
  return values.reduce((result, entry) => {
    const source = CONTENT_SOURCES.find((candidate) => candidate.toLowerCase() === String(entry || '').trim().toLowerCase());
    if (source && !seen.has(source)) {
      seen.add(source);
      result.push(source);
    }
    return result;
  }, []);
}

export function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    autoRotateSeconds: number(source.autoRotateSeconds, 1, 120, DEFAULT_SETTINGS.autoRotateSeconds),
    backdropFit: option(source.backdropFit, BACKDROP_FITS, DEFAULT_SETTINGS.backdropFit),
    backdropFocusX: number(source.backdropFocusX, 0, 100, DEFAULT_SETTINGS.backdropFocusX),
    backdropFocusY: number(source.backdropFocusY, 0, 100, DEFAULT_SETTINGS.backdropFocusY),
    backdropOpacity: number(source.backdropOpacity, 0, 100, DEFAULT_SETTINGS.backdropOpacity),
    buttonCornerStyle: option(source.buttonCornerStyle, BUTTON_CORNER_STYLES, DEFAULT_SETTINGS.buttonCornerStyle),
    buttonHeight: number(source.buttonHeight, 32, 72, DEFAULT_SETTINGS.buttonHeight),
    contentAlignment: option(source.contentAlignment, CONTENT_ALIGNMENTS, DEFAULT_SETTINGS.contentAlignment),
    contentMaxWidth: number(source.contentMaxWidth, 280, 1200, DEFAULT_SETTINGS.contentMaxWidth),
    contentOrder: contentOrder(source.contentOrder),
    descriptionColor: color(source.descriptionColor, DEFAULT_SETTINGS.descriptionColor),
    descriptionLines: number(source.descriptionLines, 1, 8, DEFAULT_SETTINGS.descriptionLines),
    descriptionSize: number(source.descriptionSize, 10, 32, DEFAULT_SETTINGS.descriptionSize),
    descriptionWeight: TITLE_WEIGHTS.includes(Number(source.descriptionWeight)) ? Number(source.descriptionWeight) : DEFAULT_SETTINGS.descriptionWeight,
    desktopHeight: number(source.desktopHeight, 40, 100, DEFAULT_SETTINGS.desktopHeight),
    enabled: source.enabled !== false,
    mobileHeight: number(source.mobileHeight, 40, 100, DEFAULT_SETTINGS.mobileHeight),
    primaryButtonBackgroundColor: color(source.primaryButtonBackgroundColor, DEFAULT_SETTINGS.primaryButtonBackgroundColor),
    primaryButtonOpacity: number(source.primaryButtonOpacity, 0, 100, DEFAULT_SETTINGS.primaryButtonOpacity),
    primaryButtonTextColor: color(source.primaryButtonTextColor, DEFAULT_SETTINGS.primaryButtonTextColor),
    randomized: source.randomized === true,
    secondaryButtonBackgroundColor: color(source.secondaryButtonBackgroundColor, DEFAULT_SETTINGS.secondaryButtonBackgroundColor),
    secondaryButtonOpacity: number(source.secondaryButtonOpacity, 0, 100, DEFAULT_SETTINGS.secondaryButtonOpacity),
    secondaryButtonTextColor: color(source.secondaryButtonTextColor, DEFAULT_SETTINGS.secondaryButtonTextColor),
    slidesShown: Number(source.slidesShown) === -1 ? -1 : number(source.slidesShown, 1, 10, DEFAULT_SETTINGS.slidesShown),
    swipeEnabled: source.swipeEnabled !== false,
    titleCase: option(source.titleCase, TITLE_CASES, DEFAULT_SETTINGS.titleCase),
    titleColor: color(source.titleColor, DEFAULT_SETTINGS.titleColor),
    titleSize: number(source.titleSize, 16, 96, DEFAULT_SETTINGS.titleSize),
    titleTreatment: option(source.titleTreatment, TITLE_TREATMENTS, DEFAULT_SETTINGS.titleTreatment),
    titleWeight: TITLE_WEIGHTS.includes(Number(source.titleWeight)) ? Number(source.titleWeight) : DEFAULT_SETTINGS.titleWeight,
    transitionDurationMs: number(source.transitionDurationMs, 100, 2000, DEFAULT_SETTINGS.transitionDurationMs),
    transitionStyle: option(source.transitionStyle, TRANSITION_STYLES, DEFAULT_SETTINGS.transitionStyle),
    verticalAlignment: option(source.verticalAlignment, VERTICAL_ALIGNMENTS, DEFAULT_SETTINGS.verticalAlignment),
    vignetteStrength: number(source.vignetteStrength, 0, 100, DEFAULT_SETTINGS.vignetteStrength),
  };
}

export function applySettings(root, settings) {
  const cornerRadius = { Pill: '999px', Rounded: '12px', Square: '0' }[settings.buttonCornerStyle];
  const variables = {
    '--sleekfin-hero-backdrop-fit': settings.backdropFit.toLowerCase(),
    '--sleekfin-hero-backdrop-focus': `${settings.backdropFocusX}% ${settings.backdropFocusY}%`,
    '--sleekfin-hero-backdrop-opacity': String(settings.backdropOpacity / 100),
    '--sleekfin-hero-button-height': `${settings.buttonHeight}px`,
    '--sleekfin-hero-button-radius': cornerRadius,
    '--sleekfin-hero-content-max-width': `${settings.contentMaxWidth}px`,
    '--sleekfin-hero-description-color': settings.descriptionColor,
    '--sleekfin-hero-description-lines': String(settings.descriptionLines),
    '--sleekfin-hero-description-size': `${settings.descriptionSize}px`,
    '--sleekfin-hero-description-weight': String(settings.descriptionWeight),
    '--sleekfin-hero-desktop-height': `${settings.desktopHeight}vh`,
    '--sleekfin-hero-mobile-height': `${settings.mobileHeight}vh`,
    '--sleekfin-hero-primary-background': settings.primaryButtonBackgroundColor,
    '--sleekfin-hero-primary-opacity': `${settings.primaryButtonOpacity}%`,
    '--sleekfin-hero-primary-text': settings.primaryButtonTextColor,
    '--sleekfin-hero-secondary-background': settings.secondaryButtonBackgroundColor,
    '--sleekfin-hero-secondary-opacity': `${settings.secondaryButtonOpacity}%`,
    '--sleekfin-hero-secondary-text': settings.secondaryButtonTextColor,
    '--sleekfin-hero-title-color': settings.titleColor,
    '--sleekfin-hero-title-size': `${settings.titleSize}px`,
    '--sleekfin-hero-title-transform': settings.titleCase === 'Uppercase' ? 'uppercase' : 'none',
    '--sleekfin-hero-title-weight': String(settings.titleWeight),
    '--sleekfin-hero-transition-duration': `${settings.transitionDurationMs}ms`,
    '--sleekfin-hero-vignette-opacity': String(settings.vignetteStrength / 100),
  };
  Object.keys(variables).forEach((name) => root.style.setProperty(name, variables[name]));
  root.dataset.contentAlignment = settings.contentAlignment.toLowerCase();
  root.dataset.swipeEnabled = String(settings.swipeEnabled);
  root.dataset.transitionStyle = settings.transitionStyle.toLowerCase();
  root.dataset.verticalAlignment = settings.verticalAlignment.toLowerCase();
}
