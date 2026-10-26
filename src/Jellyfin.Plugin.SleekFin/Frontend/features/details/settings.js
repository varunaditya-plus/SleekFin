export const SETTING_DEFINITIONS = Object.freeze([
  Object.freeze({ key: 'desktopHeight', property: 'DetailsDesktopHeight', label: 'Desktop hero height (vh)', default: 85, min: 40, max: 100, type: 'integer' }),
  Object.freeze({ key: 'mobileHeight', property: 'DetailsMobileHeight', label: 'Mobile hero height (vh)', default: 85, min: 40, max: 100, type: 'integer' }),
  Object.freeze({ key: 'mobileMinHeight', property: 'DetailsMobileMinHeight', label: 'Mobile minimum height (px)', default: 620, min: 240, max: 1200, type: 'integer' }),
  Object.freeze({ key: 'contentAlignment', property: 'DetailsContentAlignment', label: 'Horizontal alignment', default: 'Left', options: [{ label: 'Left', value: 'Left' }, { label: 'Center', value: 'Center' }, { label: 'Right', value: 'Right' }], type: 'option' }),
  Object.freeze({ key: 'verticalAlignment', property: 'DetailsVerticalAlignment', label: 'Vertical alignment', default: 'Bottom', options: [{ label: 'Top', value: 'Top' }, { label: 'Center', value: 'Center' }, { label: 'Bottom', value: 'Bottom' }], type: 'option' }),
  Object.freeze({ key: 'desktopSideInset', property: 'DetailsDesktopSideInset', label: 'Desktop side inset', default: 'Auto', min: 0, max: 240, type: 'autoLength' }),
  Object.freeze({ key: 'mobileSideInset', property: 'DetailsMobileSideInset', label: 'Mobile side inset', default: 'Auto', min: 0, max: 240, type: 'autoLength' }),
  Object.freeze({ key: 'desktopBottomSpacing', property: 'DetailsDesktopBottomSpacing', label: 'Desktop bottom spacing (px)', default: 72, min: 0, max: 240, type: 'integer' }),
  Object.freeze({ key: 'mobileBottomSpacing', property: 'DetailsMobileBottomSpacing', label: 'Mobile bottom spacing (px)', default: 48, min: 0, max: 240, type: 'integer' }),
  Object.freeze({ key: 'contentMaxWidth', property: 'DetailsContentMaxWidth', label: 'Content max width (px)', default: 520, min: 280, max: 1600, type: 'integer' }),
  Object.freeze({ key: 'buttonGroupSpacing', property: 'DetailsButtonGroupSpacing', label: 'Space between groups', default: 'Auto', min: 0, max: 480, type: 'autoLength' }),
  Object.freeze({ key: 'titleMetadataSpacing', property: 'DetailsTitleMetadataSpacing', label: 'Title to metadata (px)', default: 16, min: 0, max: 128, type: 'integer' }),
  Object.freeze({ key: 'metadataGenresSpacing', property: 'DetailsMetadataGenresSpacing', label: 'Metadata to genres (px)', default: 7, min: 0, max: 128, type: 'integer' }),
  Object.freeze({ key: 'genresDescriptionSpacing', property: 'DetailsGenresDescriptionSpacing', label: 'Genres to description (px)', default: 12, min: 0, max: 128, type: 'integer' }),
  Object.freeze({ key: 'descriptionButtonSpacing', property: 'DetailsDescriptionButtonSpacing', label: 'Description to buttons (px)', default: 18, min: 0, max: 128, type: 'integer' }),
  Object.freeze({ key: 'backdropFit', property: 'DetailsBackdropFit', label: 'Backdrop fit', default: 'Cover', options: [{ label: 'Cover', value: 'Cover' }, { label: 'Contain', value: 'Contain' }], type: 'option' }),
  Object.freeze({ key: 'backdropFocusX', property: 'DetailsBackdropFocusX', label: 'Horizontal focus (%)', default: 50, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'backdropFocusY', property: 'DetailsBackdropFocusY', label: 'Vertical focus (%)', default: 24, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'backdropOpacity', property: 'DetailsBackdropOpacity', label: 'Backdrop opacity (%)', default: 100, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'sideShading', property: 'DetailsSideShading', label: 'Side shading (%)', default: 84, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'bottomFade', property: 'DetailsBottomFade', label: 'Bottom fade (%)', default: 100, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'fadeHeight', property: 'DetailsFadeHeight', label: 'Fade height (%)', default: 50, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'backdropBlur', property: 'DetailsBackdropBlur', label: 'Backdrop blur (px)', default: 0, min: 0, max: 48, type: 'integer' }),
  Object.freeze({ key: 'trailerBackgroundEnabled', property: 'DetailsTrailerBackgroundEnabled', label: 'Trailer background', default: false, type: 'boolean' }),
  Object.freeze({ key: 'trailerStartDelaySeconds', property: 'DetailsTrailerStartDelaySeconds', label: 'Trailer start delay (s)', default: 2.5, min: 0, max: 60, type: 'number' }),
  Object.freeze({ key: 'trailerAudio', property: 'DetailsTrailerAudio', label: 'Trailer audio', default: 'Muted', options: [{ label: 'Muted', value: 'Muted' }, { label: 'Sound', value: 'Sound' }], type: 'option' }),
  Object.freeze({ key: 'trailerEndBehavior', property: 'DetailsTrailerEndBehavior', label: 'When trailer ends', default: 'Artwork', options: [{ label: 'Artwork', value: 'Artwork' }, { label: 'Loop', value: 'Loop' }], type: 'option' }),
  Object.freeze({ key: 'backdropPauseEnabled', property: 'DetailsBackdropPauseEnabled', label: 'Click backdrop to pause', default: true, type: 'boolean' }),
  Object.freeze({ key: 'titleTreatment', property: 'DetailsTitleTreatment', label: 'Title treatment', default: 'Auto', options: [{ label: 'Auto', value: 'Auto' }, { label: 'Logo', value: 'Logo' }, { label: 'Text', value: 'Text' }], type: 'option' }),
  Object.freeze({ key: 'showTitle', property: 'DetailsShowTitle', label: 'Show title', default: true, type: 'boolean' }),
  Object.freeze({ key: 'desktopLogoMaxWidth', property: 'DetailsDesktopLogoMaxWidth', label: 'Desktop logo max width (px)', default: 340, min: 80, max: 1000, type: 'integer' }),
  Object.freeze({ key: 'mobileLogoMaxWidth', property: 'DetailsMobileLogoMaxWidth', label: 'Mobile logo max width (px)', default: 300, min: 80, max: 800, type: 'integer' }),
  Object.freeze({ key: 'desktopLogoHeight', property: 'DetailsDesktopLogoHeight', label: 'Desktop logo height (px)', default: 96, min: 24, max: 320, type: 'integer' }),
  Object.freeze({ key: 'mobileLogoHeight', property: 'DetailsMobileLogoHeight', label: 'Mobile logo height (px)', default: 84, min: 24, max: 240, type: 'integer' }),
  Object.freeze({ key: 'desktopTitleSize', property: 'DetailsDesktopTitleSize', label: 'Desktop title size (px)', default: 48, min: 16, max: 120, type: 'integer' }),
  Object.freeze({ key: 'mobileTitleSize', property: 'DetailsMobileTitleSize', label: 'Mobile title size (px)', default: 36, min: 16, max: 96, type: 'integer' }),
  Object.freeze({ key: 'titleWeight', property: 'DetailsTitleWeight', label: 'Title weight', default: 800, type: 'weight' }),
  Object.freeze({ key: 'titleCase', property: 'DetailsTitleCase', label: 'Title case', default: 'Uppercase', options: [{ label: 'Original', value: 'Original' }, { label: 'Uppercase', value: 'Uppercase' }], type: 'option' }),
  Object.freeze({ key: 'titleColor', property: 'DetailsTitleColor', label: 'Title color', default: '#FFFFFF', type: 'color' }),
  Object.freeze({ key: 'titleLineHeight', property: 'DetailsTitleLineHeight', label: 'Title line height (%)', default: 95, min: 50, max: 200, type: 'integer' }),
  Object.freeze({ key: 'titleLetterSpacing', property: 'DetailsTitleLetterSpacing', label: 'Title letter spacing (%)', default: -3, min: -10, max: 20, type: 'integer' }),
  Object.freeze({ key: 'titleShadow', property: 'DetailsTitleShadow', label: 'Title shadow (%)', default: 45, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'originalTitleMode', property: 'DetailsOriginalTitleMode', label: 'Original title', default: 'Auto', options: [{ label: 'Auto', value: 'Auto' }, { label: 'Hide', value: 'Hide' }], type: 'option' }),
  Object.freeze({ key: 'originalTitleSize', property: 'DetailsOriginalTitleSize', label: 'Original title size (px)', default: 14, min: 8, max: 40, type: 'integer' }),
  Object.freeze({ key: 'originalTitleColor', property: 'DetailsOriginalTitleColor', label: 'Original title color', default: 'Theme muted', type: 'color' }),
  Object.freeze({ key: 'showParentTitle', property: 'DetailsShowParentTitle', label: 'Show parent title', default: true, type: 'boolean' }),
  Object.freeze({ key: 'parentTitleSize', property: 'DetailsParentTitleSize', label: 'Parent title size (px)', default: 11, min: 8, max: 32, type: 'integer' }),
  Object.freeze({ key: 'parentTitleColor', property: 'DetailsParentTitleColor', label: 'Parent title color', default: 'rgba(255, 255, 255, 0.68)', type: 'color' }),
  Object.freeze({ key: 'desktopChildHeadingSize', property: 'DetailsDesktopChildHeadingSize', label: 'Desktop child heading size (px)', default: 26, min: 12, max: 96, type: 'integer' }),
  Object.freeze({ key: 'mobileChildHeadingSize', property: 'DetailsMobileChildHeadingSize', label: 'Mobile child heading size (px)', default: 21, min: 12, max: 72, type: 'integer' }),
  Object.freeze({ key: 'childHeadingWeight', property: 'DetailsChildHeadingWeight', label: 'Child heading weight', default: 700, type: 'weight' }),
  Object.freeze({ key: 'childHeadingLines', property: 'DetailsChildHeadingLines', label: 'Child heading lines', default: 2, min: 1, max: 6, type: 'integer' }),
  Object.freeze({ key: 'childHeadingColor', property: 'DetailsChildHeadingColor', label: 'Child heading color', default: '#FFFFFF', type: 'color' }),
  Object.freeze({ key: 'showRating', property: 'DetailsShowRating', label: 'Show rating', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showYear', property: 'DetailsShowYear', label: 'Show year', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showRuntime', property: 'DetailsShowRuntime', label: 'Show runtime / count', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showCertification', property: 'DetailsShowCertification', label: 'Show certification', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showAudioLanguages', property: 'DetailsShowAudioLanguages', label: 'Show audio languages', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showGenres', property: 'DetailsShowGenres', label: 'Show genres', default: true, type: 'boolean' }),
  Object.freeze({ key: 'desktopMetadataSize', property: 'DetailsDesktopMetadataSize', label: 'Desktop metadata size (px)', default: 14, min: 8, max: 32, type: 'integer' }),
  Object.freeze({ key: 'mobileMetadataSize', property: 'DetailsMobileMetadataSize', label: 'Mobile metadata size (px)', default: 13, min: 8, max: 32, type: 'integer' }),
  Object.freeze({ key: 'metadataWeight', property: 'DetailsMetadataWeight', label: 'Metadata weight', default: 500, type: 'weight' }),
  Object.freeze({ key: 'metadataColor', property: 'DetailsMetadataColor', label: 'Metadata color', default: 'rgba(255, 255, 255, 0.92)', type: 'color' }),
  Object.freeze({ key: 'ratingColor', property: 'DetailsRatingColor', label: 'Rating color', default: 'Theme accent', type: 'color' }),
  Object.freeze({ key: 'genresColor', property: 'DetailsGenresColor', label: 'Genres color', default: 'rgba(255, 255, 255, 0.78)', type: 'color' }),
  Object.freeze({ key: 'factSeparator', property: 'DetailsFactSeparator', label: 'Fact separator', default: 'Dot', options: [{ label: 'Dot', value: 'Dot' }, { label: 'None', value: 'None' }], type: 'option' }),
  Object.freeze({ key: 'showDescription', property: 'DetailsShowDescription', label: 'Show description', default: true, type: 'boolean' }),
  Object.freeze({ key: 'desktopDescriptionSize', property: 'DetailsDesktopDescriptionSize', label: 'Desktop description size (px)', default: 14, min: 8, max: 40, type: 'integer' }),
  Object.freeze({ key: 'mobileDescriptionSize', property: 'DetailsMobileDescriptionSize', label: 'Mobile description size (px)', default: 13, min: 8, max: 32, type: 'integer' }),
  Object.freeze({ key: 'descriptionWidth', property: 'DetailsDescriptionWidth', label: 'Description width (px)', default: 520, min: 240, max: 1600, type: 'integer' }),
  Object.freeze({ key: 'descriptionLines', property: 'DetailsDescriptionLines', label: 'Description lines', default: 3, min: 1, max: 12, type: 'integer' }),
  Object.freeze({ key: 'descriptionColor', property: 'DetailsDescriptionColor', label: 'Description color', default: 'rgba(255, 255, 255, 0.88)', type: 'color' }),
  Object.freeze({ key: 'descriptionWeight', property: 'DetailsDescriptionWeight', label: 'Description weight', default: 400, type: 'weight' }),
  Object.freeze({ key: 'descriptionLineHeight', property: 'DetailsDescriptionLineHeight', label: 'Description line height (%)', default: 145, min: 100, max: 250, type: 'integer' }),
  Object.freeze({ key: 'descriptionExpandEnabled', property: 'DetailsDescriptionExpandEnabled', label: 'Click to expand description', default: true, type: 'boolean' }),
  Object.freeze({ key: 'desktopButtonHeight', property: 'DetailsDesktopButtonHeight', label: 'Desktop button height (px)', default: 44, min: 24, max: 80, type: 'integer' }),
  Object.freeze({ key: 'mobileButtonHeight', property: 'DetailsMobileButtonHeight', label: 'Mobile button height (px)', default: 40, min: 24, max: 80, type: 'integer' }),
  Object.freeze({ key: 'buttonSpacing', property: 'DetailsButtonSpacing', label: 'Button spacing (px)', default: 12, min: 0, max: 48, type: 'integer' }),
  Object.freeze({ key: 'buttonContent', property: 'DetailsButtonContent', label: 'Button content', default: 'Default', options: [{ label: 'Default', value: 'Default' }, { label: 'Icons', value: 'Icons' }, { label: 'Labels', value: 'Labels' }], type: 'option' }),
  Object.freeze({ key: 'buttonCornerStyle', property: 'DetailsButtonCornerStyle', label: 'Main button shape', default: 'Pill', options: [{ label: 'Square', value: 'Square' }, { label: 'Rounded', value: 'Rounded' }, { label: 'Pill', value: 'Pill' }], type: 'option' }),
  Object.freeze({ key: 'iconButtonCornerStyle', property: 'DetailsIconButtonCornerStyle', label: 'Icon button shape', default: 'Circle', options: [{ label: 'Square', value: 'Square' }, { label: 'Rounded', value: 'Rounded' }, { label: 'Circle', value: 'Circle' }], type: 'option' }),
  Object.freeze({ key: 'primaryButtonBackgroundColor', property: 'DetailsPrimaryButtonBackgroundColor', label: 'Primary background', default: '#F1F2F4', type: 'color' }),
  Object.freeze({ key: 'primaryButtonTextColor', property: 'DetailsPrimaryButtonTextColor', label: 'Primary text', default: '#05070A', type: 'color' }),
  Object.freeze({ key: 'primaryButtonOpacity', property: 'DetailsPrimaryButtonOpacity', label: 'Primary opacity (%)', default: 100, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'secondaryButtonBackgroundColor', property: 'DetailsSecondaryButtonBackgroundColor', label: 'Control background', default: '#161618', type: 'color' }),
  Object.freeze({ key: 'secondaryButtonTextColor', property: 'DetailsSecondaryButtonTextColor', label: 'Control text', default: '#F1F2F4', type: 'color' }),
  Object.freeze({ key: 'secondaryButtonOpacity', property: 'DetailsSecondaryButtonOpacity', label: 'Control opacity (%)', default: 82, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'desktopPlayIconSize', property: 'DetailsDesktopPlayIconSize', label: 'Desktop play icon size (px)', default: 22, min: 8, max: 48, type: 'integer' }),
  Object.freeze({ key: 'mobilePlayIconSize', property: 'DetailsMobilePlayIconSize', label: 'Mobile play icon size (px)', default: 20, min: 8, max: 48, type: 'integer' }),
  Object.freeze({ key: 'buttonBlur', property: 'DetailsButtonBlur', label: 'Glass blur (px)', default: 18, min: 0, max: 48, type: 'integer' }),
  Object.freeze({ key: 'controlIconSize', property: 'DetailsControlIconSize', label: 'Control icon size (px)', default: 18, min: 8, max: 48, type: 'integer' }),
  Object.freeze({ key: 'externalIconSize', property: 'DetailsExternalIconSize', label: 'External icon size (px)', default: 22, min: 8, max: 48, type: 'integer' }),
  Object.freeze({ key: 'buttonHoverOpacity', property: 'DetailsButtonHoverOpacity', label: 'Hover opacity (%)', default: 100, min: 0, max: 100, type: 'integer' }),
  Object.freeze({ key: 'buttonHoverLift', property: 'DetailsButtonHoverLift', label: 'Hover lift (px)', default: 0, min: 0, max: 16, type: 'integer' }),
  Object.freeze({ key: 'buttonActiveColor', property: 'DetailsButtonActiveColor', label: 'Active state color', default: 'Theme accent', type: 'color' }),
  Object.freeze({ key: 'mobileActionGroups', property: 'DetailsMobileActionGroups', label: 'Mobile action groups', default: 'Stack', options: [{ label: 'Inline', value: 'Inline' }, { label: 'Stack', value: 'Stack' }], type: 'option' }),
  Object.freeze({ key: 'buttonOverflow', property: 'DetailsButtonOverflow', label: 'Crowded buttons', default: 'Wrap', options: [{ label: 'Wrap', value: 'Wrap' }, { label: 'More', value: 'More' }], type: 'option' }),
  Object.freeze({ key: 'dropdownStyle', property: 'DropdownStyle', label: 'Dropdown style', default: 'Jellyfin', options: [{ label: 'Jellyfin', value: 'Jellyfin' }, { label: 'SeerrFin', value: 'SeerrFin' }, { label: 'Basic native', value: 'Native' }], type: 'option' }),
  Object.freeze({ key: 'infoPanelMaxWidth', property: 'DetailsInfoPanelMaxWidth', label: 'Info panel max width (px)', default: 560, min: 280, max: 1200, type: 'integer' }),
  Object.freeze({ key: 'showVersionPicker', property: 'DetailsShowVersionPicker', label: 'Version picker', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showVideoDetails', property: 'DetailsShowVideoDetails', label: 'Video details', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showAudioPicker', property: 'DetailsShowAudioPicker', label: 'Audio picker', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showSubtitlePicker', property: 'DetailsShowSubtitlePicker', label: 'Subtitle picker', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showItemMetadata', property: 'DetailsShowItemMetadata', label: 'Item metadata', default: true, type: 'boolean' }),
  Object.freeze({ key: 'showExternalLinks', property: 'DetailsShowExternalLinks', label: 'External database links', default: true, type: 'boolean' }),
]);

const NATIVE_ACTIONS = ['play', 'replay', 'download', 'favorite', 'trailer', 'shuffle', 'watched', 'info', 'more', 'splitVersions'];
const DEFAULT_VALUES = {};
SETTING_DEFINITIONS.forEach((definition) => { DEFAULT_VALUES[definition.key] = definition.default; });

export const DEFAULT_SETTINGS = Object.freeze({ ...DEFAULT_VALUES, leftActions: Object.freeze(['play', 'replay', 'download', 'favorite', 'trailer', 'je:letterboxd', 'je:seerr']), rightActions: Object.freeze(['watched', 'info', 'more']), hiddenActions: Object.freeze(['shuffle', 'splitVersions', 'je:radarr', 'je:sonarr', 'je:bazarr', 'je:hide', 'je:spoiler', 'je:report', 'je:request-more']), compactEpisodeGridCardsEnabled: false, seasonPostersEnabled: false });

const HEX_COLOR_PATTERN = /^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB_COLOR_PATTERN = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i;
const RGBA_COLOR_PATTERN = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+(?:\.\d*)?|\.\d+)\s*\)$/i;

function roundDecimal(value, places) {
  const [whole, fraction = ''] = value.replace(/^\+/, '').split('.');
  const scale = 10 ** places;
  const digits = (fraction + '0'.repeat(places)).slice(0, places);
  const rounded = Number(whole || 0) * scale + Number(digits) + (Number(fraction[places] || 0) >= 5 ? 1 : 0);
  return String(rounded / scale);
}

function color(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim() : '';
  const token = ['Theme accent', 'Theme muted', 'transparent'].find((entry) => entry.toLowerCase() === candidate.toLowerCase());
  if (token) return token;
  if (HEX_COLOR_PATTERN.test(candidate)) return candidate.toUpperCase();
  const match = RGB_COLOR_PATTERN.exec(candidate) || RGBA_COLOR_PATTERN.exec(candidate);
  if (!match || match.slice(1, 4).some((component) => Number(component) > 255) || (match[4] !== undefined && Number(match[4]) > 1)) return fallback;
  const components = match.slice(1, 4).map(Number);
  return match[4] === undefined ? `rgb(${components.join(', ')})` : `rgba(${components.join(', ')}, ${roundDecimal(match[4], 3)})`;
}

function normalizeValue(value, definition) {
  const { type, default: fallback, min, max } = definition;
  if (type === 'boolean') return typeof value === 'boolean' ? value : fallback;
  if (type === 'option') {
    const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
    return definition.options.find((option) => option.value.toLowerCase() === candidate)?.value || fallback;
  }
  if (type === 'color') return color(value, fallback);
  if (type === 'autoLength') {
    const candidate = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';
    if (candidate.toLowerCase() === 'auto') return 'Auto';
    if (!/^[+\-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(candidate)) return fallback;
    const numeric = Number(candidate);
    if (!Number.isFinite(numeric)) return fallback;
    return numeric <= min ? String(min) : numeric >= max ? String(max) : roundDecimal(candidate, 2);
  }
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (type === 'weight') return numeric >= 100 && numeric <= 900 && numeric % 100 === 0 ? numeric : fallback;
  const result = Math.min(max, Math.max(min, numeric));
  return type === 'number' ? result : Math.round(result);
}

function normalizeActions(value, fallback = []) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : fallback;
  const result = [];
  const seen = new Set();
  values.forEach((entry) => {
    const candidate = String(entry || '').trim();
    let action = NATIVE_ACTIONS.find((native) => native.toLowerCase() === candidate.toLowerCase());
    if (!action && /^je:[a-z\d:_.%\-]{1,253}$/i.test(candidate)) action = `je:${candidate.slice(3)}`;
    if (!action && candidate.length <= 256 && /^native:btn[A-Z][A-Za-z0-9]*$/.test(candidate)) action = candidate;
    if (action && !seen.has(action)) {
      seen.add(action);
      result.push(action);
    }
  });
  return result;
}

export function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  const result = {};
  SETTING_DEFINITIONS.forEach((definition) => { result[definition.key] = normalizeValue(source[definition.key], definition); });
  result.hiddenActions = normalizeActions(source.hiddenActions, DEFAULT_SETTINGS.hiddenActions);
  const hidden = new Set(result.hiddenActions);
  result.leftActions = normalizeActions(source.leftActions, DEFAULT_SETTINGS.leftActions).filter((action) => !hidden.has(action));
  const left = new Set(result.leftActions);
  result.rightActions = normalizeActions(source.rightActions, DEFAULT_SETTINGS.rightActions).filter((action) => !hidden.has(action) && !left.has(action));
  result.compactEpisodeGridCardsEnabled = source.compactEpisodeGridCardsEnabled === true;
  result.seasonPostersEnabled = source.seasonPostersEnabled === true;
  return result;
}

export function readConfiguration(configuration) {
  const source = configuration || {};
  const settings = {};
  SETTING_DEFINITIONS.forEach((definition) => { settings[definition.key] = source[definition.property]; });
  settings.leftActions = source.DetailsLeftActions;
  settings.rightActions = source.DetailsRightActions;
  settings.hiddenActions = source.DetailsHiddenActions;
  return normalizeSettings(settings);
}

export function writeConfiguration(configuration, settings) {
  const result = { ...configuration };
  const normalized = normalizeSettings(settings);
  SETTING_DEFINITIONS.forEach((definition) => { result[definition.property] = normalized[definition.key]; });
  result.DetailsLeftActions = normalized.leftActions.join(',');
  result.DetailsRightActions = normalized.rightActions.join(',');
  result.DetailsHiddenActions = normalized.hiddenActions.join(',');
  return result;
}

export function loadSettings(client) {
  return client.ajax({ type: 'GET', url: client.getUrl('SleekFin/Details/Settings'), dataType: 'json' }).then(normalizeSettings);
}
