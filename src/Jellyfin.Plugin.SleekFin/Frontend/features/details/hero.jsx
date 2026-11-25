import { Facts, h, IconButton, item, dom, render } from '../../shared/runtime.js';
import { applySettings } from './presentation.js';
import { DEFAULT_SETTINGS } from './settings.js';
import { createTrailerPreview } from './trailer.js';

const ARTWORK_FALLBACK_TYPES = ['Trailer', 'Video', 'BoxSet', 'Playlist'];

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
  if (settings.showRuntime && ['BoxSet', 'Playlist'].includes(mediaItem.Type) && mediaItem.ChildCount != null) {
    const count = mediaItem.ChildCount;
    values.push({ text: `${count} ${count === 1 ? 'item' : 'items'}` });
  }
  if (settings.showRuntime && mediaItem.Type === 'Series') {
    const count = seasons.filter((season) => Number(season.IndexNumber) > 0).length;
    values.push({ text: count ? `${count}${count === 1 ? ' Season' : ' Seasons'}` : 'Series' });
  } else if (settings.showRuntime && mediaItem.Type === 'Season') {
    const count = Number(mediaItem.ChildCount || mediaItem.RecursiveItemCount || 0);
    values.push({ text: count ? `${count}${count === 1 ? ' Episode' : ' Episodes'}` : 'Season' });
  } else if (settings.showRuntime) {
    const seconds = Math.round(Number(mediaItem.RunTimeTicks || 0) / 10000000);
    const shortVideo = ['Trailer', 'Video'].includes(mediaItem.Type) && seconds > 0 && seconds < 60;
    values.push({ text: shortVideo ? `${seconds}s` : item.formatRuntime(mediaItem.RunTimeTicks) });
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
  let customArtwork;
  let playlistFacts;
  const backdropOriginal = nativeBackdrop.style.backgroundImage;
  const originalItemId = page.dataset.sleekfinItemId;
  const artwork = dom.element('<div class="sleekfin-details-artwork"></div>');
  nativeBackdrop.appendChild(artwork);
  const hero = dom.element('<div class="sleekfin-details-hero"><div class="sleekfin-details-back-root"></div><img class="sleekfin-details-cover" alt="" hidden><div class="sleekfin-details-stack"><div class="sleekfin-details-title"></div><div class="sleekfin-details-child-title" hidden></div><div class="sleekfin-details-facts"></div><div class="sleekfin-details-life-facts" hidden></div><div class="sleekfin-details-genres"></div></div></div>');
  const backRoot = hero.firstElementChild;
  const cover = hero.querySelector('.sleekfin-details-cover');
  const stack = hero.querySelector('.sleekfin-details-stack');
  const title = stack.querySelector('.sleekfin-details-title');
  const childTitleRoot = stack.querySelector('.sleekfin-details-child-title');
  const seriesLink = dom.element('<a class="sleekfin-details-series-link"></a>');
  const episodeHeading = dom.element('<h3 class="itemName"></h3>');
  const factsRoot = stack.querySelector('.sleekfin-details-facts');
  const factsValuesRoot = dom.element('<span class="sleekfin-details-fact-values"></span>');
  factsRoot.appendChild(factsValuesRoot);
  const lifeFacts = stack.querySelector('.sleekfin-details-life-facts');
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

  function renderFacts(mediaItem, seasons) {
    if (mediaItem.Type === 'Playlist') {
      if (playlistFacts) mediaItem = { ...mediaItem, ...playlistFacts };
      const empty = String(mediaItem.ChildCount === 0);
      if (actions.dataset.sleekfinPlaylistEmpty !== empty) actions.dataset.sleekfinPlaylistEmpty = empty;
    } else if (actions.dataset.sleekfinPlaylistEmpty !== undefined) {
      delete actions.dataset.sleekfinPlaylistEmpty;
    }
    render(<Facts values={mediaItem.Type === 'Person' ? [] : factValues(mediaItem, seasons, settings)} />, factsValuesRoot);
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
    const isPerson = mediaItem.Type === 'Person';
    const usesArtworkFallback = ARTWORK_FALLBACK_TYPES.includes(mediaItem.Type);
    const imageOptions = { maxWidth: Math.max(960, window.innerWidth), quality: 90 };

    let backdropUrl = isPerson ? '' : item.imageUrl(mediaItem, 'Backdrop', { ...imageOptions, inherit: true });
    if (usesArtworkFallback && !backdropUrl) {
      backdropUrl = item.imageUrl(mediaItem, 'Thumb', imageOptions);
      if (!backdropUrl && mediaItem.PrimaryImageAspectRatio >= 1.35) backdropUrl = item.imageUrl(mediaItem, 'Primary', imageOptions);
    }

    const coverUrl = isPerson || usesArtworkFallback && !backdropUrl ? item.imageUrl(mediaItem, 'Primary', { maxWidth: 640, quality: 90 }) : '';
    if (cover.getAttribute('src') !== (coverUrl || null)) {
      cover.hidden = !coverUrl;
      if (coverUrl) cover.src = coverUrl;
      else cover.removeAttribute('src');
    }
    
    const compact = isPerson || usesArtworkFallback && !backdropUrl;
    hero.classList.toggle('sleekfin-details-compact-hero', compact);
    hero.classList.toggle('sleekfin-details-logo-fallback', isPerson || usesArtworkFallback);
    hero.classList.toggle('sleekfin-details-person', isPerson);
    hero.classList.toggle('sleekfin-details-playlist-hero', mediaItem.Type === 'Playlist');
    if (isPerson && !lifeFacts.childElementCount) ['#itemBirthday', '#itemDeathDate', '#itemBirthLocation'].forEach((selector) => move(page.querySelector(selector), lifeFacts));
    lifeFacts.hidden = !isPerson;
    const isEpisode = mediaItem.Type === 'Episode';
    const isChild = mediaItem.Type === 'Season' || mediaItem.Type === 'Episode';
    actions.dataset.sleekfinCanDownload = String(item.canDownload(mediaItem));
    childTitleRoot.hidden = !isChild;
    hero.classList.toggle('sleekfin-details-has-child-title', isChild);
    hero.classList.toggle('sleekfin-details-episode', isEpisode);
    const nameRoot = mediaItem.Type === 'Season' ? childTitleRoot : title;
    if (name && name.parentNode !== nameRoot) nameRoot.appendChild(name);
    if (isEpisode) {
      const heading = item.episodeTitle(mediaItem);
      if (episodeHeading.textContent !== heading) episodeHeading.textContent = heading;
      if (episodeHeading.parentNode !== childTitleRoot) childTitleRoot.appendChild(episodeHeading);
    } else episodeHeading.remove();
    if (isEpisode && mediaItem.SeriesId && logo) {
      const serverId = mediaItem.ServerId || window.ApiClient?.serverId?.() || '';
      if (!preview) seriesLink.href = `#/details?id=${encodeURIComponent(mediaItem.SeriesId)}${serverId ? `&serverId=${encodeURIComponent(serverId)}` : ''}`;
      seriesLink.title = mediaItem.SeriesName || '';
      if (seriesLink.parentNode !== title) title.insertBefore(seriesLink, name);
      if (logo.parentNode !== seriesLink) seriesLink.appendChild(logo);
    } else {
      if (logo && logo.parentNode !== title) title.insertBefore(logo, title.firstChild);
      seriesLink.remove();
    }
    renderFacts(mediaItem, seasons);
    render(<Facts keepTogether values={(mediaItem.Genres || []).map((genre) => ({ text: genre }))} />, genresRoot);

    const background = backdropUrl ? `url("${backdropUrl.replace(/["\\]/g, '\\$&')}")` : '';
    nativeBackdrop.style.backgroundImage = background;
    customArtwork = isPerson || usesArtworkFallback ? background : undefined;
    trailerPreview.update(mediaItem, compact && settings.trailerBackgroundEnabled ? { ...settings, trailerBackgroundEnabled: false } : settings);
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
    if (customArtwork === undefined) {
      const source = Array.from(page.querySelectorAll('.backdropImage')).find((element) => window.getComputedStyle(element).backgroundImage !== 'none');
      const background = source && window.getComputedStyle(source).backgroundImage;
      if (background && background !== 'none') nativeBackdrop.style.backgroundImage = background;
    }
    const image = customArtwork ?? nativeBackdrop.style.backgroundImage;
    if (artwork.style.backgroundImage !== image) artwork.style.backgroundImage = image;
    hero.classList.toggle('sleekfin-details-has-logo', Boolean(settings.titleTreatment !== 'Text' && logo && !logo.classList.contains('hide') && window.getComputedStyle(logo).backgroundImage !== 'none'));
  }

  function onHeroClick(event) {
    if (settings.backdropPauseEnabled && (hero.contains(event.target) || nativeBackdrop.contains(event.target)) && !event.target.closest('a, button, .overview')) trailerPreview.togglePlayback();
  }

  if (preview) backRoot.remove();
  else render(<IconButton class="sleekfin-details-back" icon="arrowLeft" label="Back" raised onClick={goBack} />, backRoot);
  cover.onerror = () => { cover.hidden = true; };
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
    setPlaylistFacts(mediaItem, count = mediaItem.ChildCount, runTimeTicks = mediaItem.RunTimeTicks) {
      if (playlistFacts?.ChildCount === count && playlistFacts?.RunTimeTicks === runTimeTicks) return;
      playlistFacts = { ChildCount: count, RunTimeTicks: runTimeTicks };
      renderFacts(mediaItem, []);
    },
    destroy() {
      trailerPreview.destroy();
      page.removeEventListener('click', onHeroClick);
      destroyOverview?.();
      restoreSettings?.();
      delete actions.dataset.sleekfinCanDownload;
      delete actions.dataset.sleekfinPlaylistEmpty;
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
