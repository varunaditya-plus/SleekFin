import { Facts, Fragment, h, IconButton, item, dom, render } from '../../shared/runtime.js';

function goBack() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.hash = '#/home';
  }
}

function childTitle(mediaItem) {
  if (mediaItem.Type !== 'Season' && mediaItem.Type !== 'Episode') return null;

  let kicker = mediaItem.SeriesName || 'TV Show';
  if (mediaItem.Type === 'Episode') {
    const season = mediaItem.SeasonName || (mediaItem.ParentIndexNumber ? `Season ${mediaItem.ParentIndexNumber}` : '');
    const episode = mediaItem.IndexNumber ? `Episode ${mediaItem.IndexNumber}` : '';
    kicker = [season, episode].filter(Boolean).join(' · ') || kicker;
  }

  return (
    <>
      <span class="sleekfin-details-child-kicker">{kicker}</span>
      <h1 class="sleekfin-details-child-name">{mediaItem.Name || ''}</h1>
    </>
  );
}

function factValues(mediaItem, seasons) {
  const values = [];
  const score = Number(mediaItem.CommunityRating || 0);
  if (score > 0) {
    values.push({ className: 'sleekfin-details-score', icon: 'star', text: score.toFixed(1) });
  }
  values.push({ text: item.year(mediaItem) });
  if (mediaItem.Type === 'Series') {
    const count = seasons.filter((season) => Number(season.IndexNumber) > 0).length;
    values.push({ text: count ? `${count}${count === 1 ? ' Season' : ' Seasons'}` : 'Series' });
  } else if (mediaItem.Type === 'Season') {
    const count = Number(mediaItem.ChildCount || mediaItem.RecursiveItemCount || 0);
    values.push({ text: count ? `${count}${count === 1 ? ' Episode' : ' Episodes'}` : 'Season' });
  } else {
    values.push({ text: item.formatRuntime(mediaItem.RunTimeTicks) });
  }
  values.push({ className: 'sleekfin-details-certification', text: mediaItem.OfficialRating });
  return values;
}

export function createHero(page) {
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const nativeBackdrop = page.querySelector('#itemBackdrop');
  const actions = page.querySelector('.mainDetailButtons');
  if (!wrapper || !nativeBackdrop || !actions) return null;

  let moved = [];
  const backdropOriginal = nativeBackdrop.style.backgroundImage;
  const hero = dom.element('<div class="sleekfin-details-hero"><div></div><div class="sleekfin-details-stack"><div class="sleekfin-details-title"></div><div class="sleekfin-details-child-title" hidden></div><div class="sleekfin-details-facts"></div><div class="sleekfin-details-genres"></div></div><div class="sleekfin-details-track-slot"></div></div>');
  const backRoot = hero.firstElementChild;
  const stack = hero.querySelector('.sleekfin-details-stack');
  const title = stack.querySelector('.sleekfin-details-title');
  const childTitleRoot = stack.querySelector('.sleekfin-details-child-title');
  const factsRoot = stack.querySelector('.sleekfin-details-facts');
  const genresRoot = stack.querySelector('.sleekfin-details-genres');
  const trackSlot = hero.querySelector('.sleekfin-details-track-slot');
  const downloadWasHidden = actions.querySelector('.btnDownload')?.classList.contains('hide');
  const logo = page.querySelector('.detailLogo');

  function move(element, destination) {
    if (!element) return;
    moved.push({ element, next: element.nextSibling, parent: element.parentNode });
    destination.appendChild(element);
  }

  function restoreMoved() {
    moved.reverse().forEach((record) => {
      if (!dom.isConnected(record.element)) return;
      if (dom.isConnected(record.parent)) {
        record.parent.insertBefore(record.element, record.next?.parentNode === record.parent ? record.next : null);
      } else {
        record.element.remove();
      }
    });
    moved = [];
  }

  function renderHero(mediaItem, seasons) {
    const backdropUrl = item.imageUrl(mediaItem, 'Backdrop', { maxWidth: Math.max(960, window.innerWidth), inherit: true, quality: 90 });
    const isChild = mediaItem.Type === 'Season' || mediaItem.Type === 'Episode';
    childTitleRoot.hidden = !isChild;
    hero.classList.toggle('sleekfin-details-has-child-title', isChild);
    render(childTitle(mediaItem), childTitleRoot);
    render(<Facts values={factValues(mediaItem, seasons)} />, factsRoot);
    render(<Facts values={(mediaItem.Genres || []).map((genre) => ({ text: genre }))} />, genresRoot);

    actions.querySelector('.btnDownload')?.classList.toggle('hide', !['Movie', 'Episode'].includes(mediaItem.Type) || !mediaItem.CanDownload);
    if (backdropUrl) {
      nativeBackdrop.style.backgroundImage = `url("${backdropUrl.replace(/["\\]/g, '\\$&')}")`;
    }
  }

  function sync() {
    const source = Array.from(page.querySelectorAll('.backdropImage')).find((element) => window.getComputedStyle(element).backgroundImage !== 'none');
    const background = source && window.getComputedStyle(source).backgroundImage;
    if (background && background !== 'none') {
      nativeBackdrop.style.backgroundImage = background;
    }
    hero.classList.toggle('sleekfin-details-has-logo', Boolean(logo && window.getComputedStyle(logo).backgroundImage !== 'none'));
  }

  render(<IconButton class="sleekfin-details-back" icon="arrowLeft" label="Back" raised onClick={goBack} />, backRoot);
  move(logo, title);
  move(page.querySelector('.nameContainer'), title);
  move(page.querySelector('.overview'), stack);
  move(page.querySelector('.overview-controls'), stack);
  move(actions, stack);
  page.insertBefore(hero, wrapper);
  sync();

  return {
    actions,
    trackSlot,
    destroy() {
      actions.querySelector('.btnDownload')?.classList.toggle('hide', downloadWasHidden);
      render(null, backRoot);
      render(null, childTitleRoot);
      render(null, factsRoot);
      render(null, genresRoot);
      restoreMoved();
      hero.remove();
      nativeBackdrop.style.backgroundImage = backdropOriginal;
    },
    isConnected() {
      return dom.isConnected(hero) && dom.isConnected(nativeBackdrop);
    },
    render: renderHero,
    sync,
  };
}
