import { Facts, h, IconButton, item, dom, render } from '../../shared/runtime.js';
import { applySettings } from './presentation.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { createTrailerPreview } from './trailer.js';

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = '#/home';
  }
}

function factValues(mediaItem, seasons, settings) {
  const values = [];
  const score = Number(mediaItem.CommunityRating || 0);
  if (settings.showRating && score > 0) {
    values.push({ className: 'sleekfin-details-score', icon: 'star', text: score.toFixed(1) });
  }
  if (settings.showYear) values.push({ text: item.year(mediaItem) });
  if (settings.showRuntime && mediaItem.Type === 'Series') {
    const count = seasons.filter((season) => Number(season.IndexNumber) > 0).length;
    values.push({ text: count ? `${count}${count === 1 ? ' Season' : ' Seasons'}` : 'Series' });
  } else if (settings.showRuntime && mediaItem.Type === 'Season') {
    const count = Number(mediaItem.ChildCount || mediaItem.RecursiveItemCount || 0);
    values.push({ text: count ? `${count}${count === 1 ? ' Episode' : ' Episodes'}` : 'Season' });
  } else if (settings.showRuntime) {
    values.push({ text: item.formatRuntime(mediaItem.RunTimeTicks) });
  }
  if (settings.showCertification) values.push({ className: 'sleekfin-details-certification', text: mediaItem.OfficialRating });
  return values;
}

export function createHero(page, { preview = false } = {}) {
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const nativeBackdrop = page.querySelector('#itemBackdrop');
  const actions = page.querySelector('.mainDetailButtons');
  if (!wrapper || !nativeBackdrop || !actions) return null;

  let moved = [];
  let settings = DEFAULT_SETTINGS;
  let restoreSettings = null;
  let destroyOverview = null;
  const backdropOriginal = nativeBackdrop.style.backgroundImage;
  const originalItemId = page.dataset.sleekfinItemId;
  const artwork = dom.element('<div class="sleekfin-details-artwork"></div>');
  nativeBackdrop.appendChild(artwork);
  const hero = dom.element('<div class="sleekfin-details-hero"><div class="sleekfin-details-back-root"></div><div class="sleekfin-details-stack"><div class="sleekfin-details-title"></div><div class="sleekfin-details-child-title" hidden></div><div class="sleekfin-details-facts"></div><div class="sleekfin-details-genres"></div></div></div>');
  const backRoot = hero.firstElementChild;
  const stack = hero.querySelector('.sleekfin-details-stack');
  const title = stack.querySelector('.sleekfin-details-title');
  const childTitleRoot = stack.querySelector('.sleekfin-details-child-title');
  const factsRoot = stack.querySelector('.sleekfin-details-facts');
  const factsValuesRoot = dom.element('<span class="sleekfin-details-fact-values"></span>');
  factsRoot.appendChild(factsValuesRoot);
  const genresRoot = stack.querySelector('.sleekfin-details-genres');
  const trailerPreview = createTrailerPreview(page, nativeBackdrop, actions);
  const logo = page.querySelector('.detailLogo');
  const name = page.querySelector('.nameContainer');
  const overview = page.querySelector('.overview');

  function move(element, destination) {
    if (!element) return;
    moved.push({ element, next: element.nextSibling, parent: element.parentNode });
    destination.appendChild(element);
  }

  function restoreMoved() {
    moved.reverse().forEach((record) => {
      if (!hero.contains(record.element)) return;
      if (page.contains(record.parent)) {
        record.parent.insertBefore(record.element, record.next?.parentNode === record.parent ? record.next : null);
      } else {
        record.element.remove();
      }
    });
    moved = [];
  }

  function renderHero(mediaItem, seasons, nextSettings) {
    page.dataset.sleekfinItemId = mediaItem.Id || '';
    settings = nextSettings;
    restoreSettings?.();
    restoreSettings = applySettings(page, settings);
    if (overview && Boolean(destroyOverview) !== settings.descriptionExpandEnabled) {
      destroyOverview?.();
      destroyOverview = settings.descriptionExpandEnabled ? dom.expandableText(overview) : null;
    }
    const backdropUrl = item.imageUrl(mediaItem, 'Backdrop', { maxWidth: Math.max(960, window.innerWidth), inherit: true, quality: 90 });
    const isChild = mediaItem.Type === 'Season' || mediaItem.Type === 'Episode';
    actions.dataset.sleekfinCanDownload = String(['Movie', 'Episode'].includes(mediaItem.Type) && mediaItem.CanDownload === true && (!window.NativeShell || window.NativeShell.AppHost.supports('filedownload')));
    childTitleRoot.hidden = !isChild;
    hero.classList.toggle('sleekfin-details-has-child-title', isChild);
    const nameRoot = isChild ? childTitleRoot : title;
    if (name && name.parentNode !== nameRoot) nameRoot.appendChild(name);
    render(<Facts values={factValues(mediaItem, seasons, settings)} />, factsValuesRoot);
    render(<Facts values={(mediaItem.Genres || []).map((genre) => ({ text: genre }))} />, genresRoot);

    nativeBackdrop.style.backgroundImage = backdropUrl ? `url("${backdropUrl.replace(/["\\]/g, '\\$&')}")` : '';
    trailerPreview.update(mediaItem, settings);
    sync();
  }

  function sync() {
    if (!preview) {
      const header = document.documentElement.classList.contains('sleekfin-header-mounted') ? Array.from(document.querySelectorAll('[data-sleekfin-header]')).find(dom.isVisible) : null;
      const menu = header?.querySelector('.mainDrawerButton, svg[data-testid="MenuIcon"]')?.closest('button');
      backRoot.classList.toggle('sleekfin-details-back-after-menu', dom.isVisible(menu));
      const backParent = header || hero;
      if (backRoot.parentNode !== backParent) backParent.appendChild(backRoot);
    }
    const source = Array.from(page.querySelectorAll('.backdropImage')).find((element) => window.getComputedStyle(element).backgroundImage !== 'none');
    const background = source && window.getComputedStyle(source).backgroundImage;
    if (background && background !== 'none') {
      nativeBackdrop.style.backgroundImage = background;
    }
    const image = nativeBackdrop.style.backgroundImage;
    if (artwork.style.backgroundImage !== image) artwork.style.backgroundImage = image;
    hero.classList.toggle('sleekfin-details-has-logo', Boolean(settings.titleTreatment !== 'Text' && logo && !logo.classList.contains('hide') && window.getComputedStyle(logo).backgroundImage !== 'none'));
  }

  function onHeroClick(event) {
    if (settings.backdropPauseEnabled && (hero.contains(event.target) || nativeBackdrop.contains(event.target)) && !event.target.closest('a, button, .overview')) trailerPreview.togglePlayback();
  }

  if (preview) backRoot.remove();
  else render(<IconButton class="sleekfin-details-back" icon="arrowLeft" label="Back" raised onClick={goBack} />, backRoot);
  page.addEventListener('click', onHeroClick);
  move(logo, title);
  move(name, title);
  move(page.querySelector('.itemMiscInfo-primary'), factsRoot);
  move(overview, stack);
  move(page.querySelector('.overview-controls'), stack);
  move(actions, stack);
  page.insertBefore(hero, wrapper);
  sync();

  return {
    actions,
    destroy() {
      trailerPreview.destroy();
      page.removeEventListener('click', onHeroClick);
      destroyOverview?.();
      restoreSettings?.();
      delete actions.dataset.sleekfinCanDownload;
      render(null, backRoot);
      backRoot.remove();
      render(null, factsValuesRoot);
      render(null, genresRoot);
      restoreMoved();
      hero.remove();
      artwork.remove();
      nativeBackdrop.style.backgroundImage = backdropOriginal;
      if (originalItemId === undefined) delete page.dataset.sleekfinItemId;
      else page.dataset.sleekfinItemId = originalItemId;
    },
    isConnected() {
      return dom.isConnected(hero) && dom.isConnected(nativeBackdrop);
    },
    render: renderHero,
    sync,
  };
}
