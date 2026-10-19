import { element, replace } from '../shared/dom.js';
import { h } from 'preact';

const STROKE_WIDTHS = { download: 2, info: 2, star: 2 };

const ICONS = {
  arrowDownAz: '<path d="m3 16 4 4 4-4"></path><path d="M7 20V4"></path><path d="M20 8h-5"></path><path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"></path><path d="M15 14h5l-5 6h5"></path>',
  arrowLeft: '<path d="m12 19-7-7 7-7"></path><path d="M19 12H5"></path>',
  arrowUpAz: '<path d="m3 8 4-4 4 4"></path><path d="M7 4v16"></path><path d="M20 8h-5"></path><path d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10"></path><path d="M15 14h5l-5 6h5"></path>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" x2="12" y1="15" y2="3"></line>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>',
  info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
  list: '<line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line>',
  play: '<polygon points="5,3 19,12 5,21"></polygon>',
  search: '<circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
};

function values(name, strokeWidth) {
  const markup = ICONS[name];
  if (!markup) return null;

  return { fill: name === 'play' || name === 'star' ? 'currentColor' : 'none', markup, stroke: name === 'play' ? 'none' : 'currentColor', strokeWidth: strokeWidth || STROKE_WIDTHS[name] || 1.75 };
}

function iconMarkup(name) {
  const icon = values(name);
  return icon ? `<svg class="sleekfin-icon" data-sleekfin-icon="${name}" viewBox="0 0 24 24" fill="${icon.fill}" stroke="${icon.stroke}" stroke-width="${icon.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${icon.markup}</svg>` : '';
}

function createIconElement(name) {
  const markup = iconMarkup(name);
  return markup ? element(markup) : null;
}

export function setIcon(parent, name) {
  const current = parent.querySelector(':scope > .sleekfin-icon');
  if (current?.dataset.sleekfinIcon === name) return;

  const icon = createIconElement(name);
  if (!icon) return;
  replace(current, icon);
  if (!current) {
    parent.insertBefore(icon, parent.firstChild);
  }
}

export function Icon({ name, strokeWidth }) {
  const icon = values(name, strokeWidth);
  if (!icon) return null;

  return (
    <svg class="sleekfin-icon" data-sleekfin-icon={name} viewBox="0 0 24 24" fill={icon.fill} stroke={icon.stroke} stroke-width={icon.strokeWidth} stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML={{ __html: icon.markup }} />
  );
}
