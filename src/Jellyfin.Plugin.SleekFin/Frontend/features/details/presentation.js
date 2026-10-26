import { DEFAULT_SETTINGS, SETTING_DEFINITIONS } from './settings.js';

const FRACTIONS = new Set(['backdropOpacity', 'sideShading', 'bottomFade', 'titleLineHeight', 'titleShadow', 'descriptionLineHeight', 'primaryButtonOpacity', 'secondaryButtonOpacity', 'buttonHoverOpacity']);
const PERCENTAGES = new Set(['backdropFocusX', 'backdropFocusY', 'fadeHeight']);
const RESPONSIVE = ['sideInset', 'bottomSpacing', 'logoMaxWidth', 'logoHeight', 'titleSize', 'childHeadingSize', 'metadataSize', 'descriptionSize', 'buttonHeight', 'playIconSize'];

const name = (key) => key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const color = (value) => value === 'Theme accent' ? 'var(--sleekfin-accent)' : value === 'Theme muted' ? 'var(--sleekfin-muted)' : value;

export function applySettings(root, values, { mobile = root.dataset.sleekfinDetailsPreview ? root.dataset.sleekfinDetailsPreview === 'mobile' : undefined } = {}) {
  const settings = { ...DEFAULT_SETTINGS, ...values };
  const properties = [];
  const attributes = [];
  const set = (key, value) => {
    const property = `--sleekfin-details-${name(key)}`;
    properties.push([property, root.style.getPropertyValue(property)]);
    root.style.setProperty(property, value);
  };
  for (const definition of SETTING_DEFINITIONS) {
    const { key, type } = definition;
    const value = settings[key];
    if (type === 'boolean' || type === 'option') {
      const attribute = `data-sleekfin-details-${name(key)}`;
      attributes.push([attribute, root.getAttribute(attribute)]);
      root.setAttribute(attribute, String(value));
    } else if (type === 'color') set(key, color(value));
    else if (type === 'autoLength') set(key, value === 'Auto' ? 'var(--sleekfin-page-gutter)' : `${value}px`);
    else if (type === 'weight') set(key, value);
    else if (FRACTIONS.has(key)) set(key, value / 100);
    else if (PERCENTAGES.has(key)) set(key, `${value}%`);
    else if (key === 'desktopHeight' || key === 'mobileHeight') set(key, `${value}vh`);
    else if (key === 'titleLetterSpacing') set(key, `${value / 100}em`);
    else if (key === 'descriptionLines' || key === 'childHeadingLines') set(key, value);
    else if (type === 'integer' || type === 'number') set(key, `${value}px`);
  }
  const prefix = mobile ? 'mobile' : 'desktop';
  RESPONSIVE.forEach((key) => set(key, mobile === undefined ? `var(--sleekfin-details-responsive-${name(key)}, var(--sleekfin-details-desktop-${name(key)}))` : `var(--sleekfin-details-${prefix}-${name(key)})`));
  const mobileHeight = 'max(var(--sleekfin-details-mobile-min-height), var(--sleekfin-details-mobile-height))';
  set('heroHeight', mobile === undefined ? 'var(--sleekfin-details-responsive-hero-height, var(--sleekfin-details-desktop-height))' : mobile ? mobileHeight : 'var(--sleekfin-details-desktop-height)');
  set('contentAlign', { Left: 'flex-start', Center: 'center', Right: 'flex-end' }[settings.contentAlignment]);
  set('textAlign', settings.contentAlignment.toLowerCase());
  set('verticalAlign', { Top: 'flex-start', Center: 'center', Bottom: 'flex-end' }[settings.verticalAlignment]);
  set('titleTransform', settings.titleCase === 'Uppercase' ? 'uppercase' : 'none');
  set('backdropSize', settings.backdropFit.toLowerCase());
  set('descriptionToButtons', `${settings.descriptionButtonSpacing}px`);
  return () => {
    properties.forEach(([property, value]) => value ? root.style.setProperty(property, value) : root.style.removeProperty(property));
    attributes.forEach(([attribute, value]) => value === null ? root.removeAttribute(attribute) : root.setAttribute(attribute, value));
  };
}
