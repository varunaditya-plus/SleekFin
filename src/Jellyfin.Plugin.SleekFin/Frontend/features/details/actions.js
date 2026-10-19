import { decorateNativeButton, restoreNativeButton } from '../../shared/runtime.js';

const ENHANCED_LINKS = '.letterboxd-link, .seerr-link, .arr-link, .arr-tag-link';
const ENHANCED_BUTTONS = '.je-detail-hide-btn, .je-spoiler-blur-btn, .jellyseerr-report-issue-icon, .jellyseerr-report-unavailable-icon, .je-series-request-more-btn';

export function createActions(container, page) {
  const decorated = new Set();
  const enhanced = new Map();

  function releaseEnhanced(control, record, restore) {
    const { unit, source, icon, letterboxdIcon, menu, menuLeft } = record;
    if (source) {
      if (unit.parentNode === container) {
        if (restore && page.contains(source)) source.replaceWith(unit);
        else unit.remove();
      }
      source.remove();
    }
    icon?.remove();
    if (menu) menu.style.left = menuLeft;
    if (letterboxdIcon) control.classList.remove('letterboxd-link-icon');
    unit.classList.remove('sleekfin-details-enhanced-action');
    control.classList.remove('sleekfin-details-enhanced-action');
    control.classList.remove('sleekfin-control-3d');
    decorated.delete(control);
    enhanced.delete(control);
  }

  function adoptEnhanced(control) {
    if (enhanced.has(control) || control.hasAttribute('data-sleekfin-enhanced-source')) return;
    const unit = control.closest('.arr-dropdown') || control;
    let source = null;

    if (unit.parentNode !== container) {
      source = document.createElement('span');
      source.className = [...control.classList].filter((name) => ['letterboxd-link', 'seerr-link', 'arr-link', 'arr-tag-link', 'je-series-request-more-btn'].includes(name)).join(' ');
      source.dataset.sleekfinEnhancedSource = 'true';

      if (control.dataset.itemId) source.dataset.itemId = control.dataset.itemId;
      source.hidden = true;
      unit.before(source);
      container.appendChild(unit);
    }

    const letterboxdIcon = control.classList.contains('letterboxd-link') && !control.classList.contains('letterboxd-link-icon');
    if (letterboxdIcon) control.classList.add('letterboxd-link-icon');
    let icon = null;

    if (control.matches('.seerr-link, .arr-link') && !control.querySelector('img')) {
      const label = [...control.childNodes].find((node) => node.nodeType === Node.TEXT_NODE)?.textContent.trim();
      const asset = control.classList.contains('seerr-link') ? 'seerr.svg' : { Sonarr: 'sonarr.svg', Radarr: 'radarr-light-hybrid-light.svg', Bazarr: 'bazarr.svg' }[label];
      if (asset && window.JellyfinEnhanced?.cdn?.selfhst) {
        icon = document.createElement('img');
        icon.src = window.JellyfinEnhanced.cdn.selfhst(`svg/${asset}`);
        icon.alt = label;
        control.appendChild(icon);
      }
    }

    unit.classList.add('sleekfin-details-enhanced-action');
    control.classList.add('sleekfin-details-enhanced-action', 'sleekfin-control-3d');
    const menu = unit.querySelector('.arr-dropdown-menu');
    enhanced.set(control, { unit, source, icon, letterboxdIcon, menu, menuLeft: menu?.style.left });
  }

  function positionMenus() {
    enhanced.forEach(({ unit, menu }) => {
      if (menu && unit.classList.contains('open')) menu.style.left = `${Math.min(0, window.innerWidth - 16 - unit.getBoundingClientRect().left - menu.offsetWidth)}px`;
    });
  }

  function onEnhancedClick(event) {
    if (event.target.closest('.arr-dropdown')) window.requestAnimationFrame(positionMenus);
  }

  function reconcile() {
    if (!page.isConnected || page.classList.contains('hide') || !page.contains(container)) return;
    enhanced.forEach((record, control) => {
      if (!container.contains(record.unit) || !record.unit.contains(control) || (record.source && !page.contains(record.source))) releaseEnhanced(control, record, false);
    });
    
    page.querySelectorAll('.itemExternalLinks').forEach((links) => links.querySelectorAll(ENHANCED_LINKS).forEach(adoptEnhanced));
    page.querySelectorAll(ENHANCED_BUTTONS).forEach(adoptEnhanced);
    container.querySelectorAll('.detailButton').forEach((element) => {
      element.classList.add('sleekfin-control-3d');
      decorated.add(element);
    });
    const buttons = container.querySelectorAll('.btnPlay, .btnReplay, .btnDownload, .btnUserRating');

    buttons.forEach((element) => {
      const isFavorite = element.classList.contains('btnUserRating');
      const isDownload = element.classList.contains('btnDownload');
      // Jellyfin only shows Replay beside Resume. Replay and Favorite keep their native glyphs, matching the card hearts.
      const isReplay = element.classList.contains('btnReplay');
      const icon = isFavorite ? 'favorite' : isDownload ? 'download' : isReplay ? 'replay' : 'play';
      const label = isFavorite ? element.title : isDownload ? 'Download' : isReplay ? 'Start from beginning' : element.title || 'Play';

      decorateNativeButton(element, {
        content: element.querySelector('.detailButton-content') || element,
        icon,
        label,
        variant: icon === 'play' ? 'primary' : 'control',
      });
      decorated.add(element);
    });
  }

  const observer = new MutationObserver(reconcile);
  observer.observe(container, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-isfavorite', 'title'],
  });
  container.addEventListener('click', onEnhancedClick, true);
  window.addEventListener('resize', positionMenus);

  return {
    destroy() {
      observer.disconnect();
      container.removeEventListener('click', onEnhancedClick, true);
      window.removeEventListener('resize', positionMenus);
      enhanced.forEach((record, control) => releaseEnhanced(control, record, true));
      decorated.forEach((element) => {
        restoreNativeButton(element);
        element.classList.remove('sleekfin-control-3d');
      });
      decorated.clear();
    },
    reconcile,
  };
}
