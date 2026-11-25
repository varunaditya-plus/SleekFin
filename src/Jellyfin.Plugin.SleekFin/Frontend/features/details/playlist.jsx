import { dom, h, item, Meta, render, SectionHeading, useEffect, useRef } from '../../shared/runtime.js';
import { cardFacts, fitMetadata } from '../media/metadata.jsx';
import { EpisodeCard } from './episodes.jsx';

const POSTER_TYPES = new Set(['Series', 'Season', 'BoxSet', 'Book', 'Person']);
const MOVIE_CARD_CLASSES = ['sleekfin-details-playlist-movie', 'card', 'card-hoverable', 'card-withuserdata'];
const SORT_OPTIONS = { handle: '.listItemImage, .sleekfin-details-episode-action, .sleekfin-details-playlist-movie .cardImageContainer', delayOnTouchOnly: true, delay: 180, touchStartThreshold: 5 };

function MovieCard({ movie, nativeArtwork, playlistControls, tv }) {
  const buttons = useRef(null);
  const indicators = useRef(null);
  const footer = useRef(null);
  const image = item.imageUrl(movie, 'Primary', { maxWidth: 480, quality: 90 });
  const href = `#/details?id=${encodeURIComponent(movie.Id)}&serverId=${encodeURIComponent(movie.ServerId || '')}`;
  const Artwork = tv ? 'div' : 'a';

  useEffect(() => {
    const played = nativeArtwork?.querySelector('.listItemIndicators .playedIndicator')?.cloneNode(true);
    const progress = nativeArtwork?.querySelector('.listItemProgressBar')?.cloneNode(true);
    if (played && !indicators.current.querySelector('.playedIndicator')) indicators.current.appendChild(played);
    if (progress && !footer.current.querySelector('.itemProgressBar')) {
      progress.classList.remove('listItemProgressBar');
      footer.current.appendChild(progress);
    }
    if (tv) return undefined;
    const holder = buttons.current;
    const nativeButtons = Array.from(playlistControls.children);
    nativeButtons.forEach((button) => {
      button.classList.add('cardOverlayButton', 'cardOverlayButton-hover');
      button.firstElementChild?.classList.add('cardOverlayButtonIcon');
      holder.appendChild(button);
    });
    return () => nativeButtons.forEach((button) => {
      button.classList.remove('cardOverlayButton', 'cardOverlayButton-hover');
      button.firstElementChild?.classList.remove('cardOverlayButtonIcon');
      playlistControls.appendChild(button);
    });
  }, [nativeArtwork, playlistControls, tv]);

  return (
    <div class="cardBox">
      <div class="cardScalable">
        <div class="cardPadder cardPadder-portrait" />
        <Artwork class={`cardImageContainer coveredImage cardContent${tv ? '' : ' itemAction'}`} href={tv ? undefined : href} data-action={tv ? undefined : 'playallfromhere'} title={movie.Name} draggable={false}>
          <span class="cardImageIcon material-icons movie" />
          {image && <img src={image} alt="" draggable={false} loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
          <div class="indicators"><div class="cardIndicators" ref={indicators} /></div>
          <div class="innerCardFooter fullInnerCardFooter innerCardFooterClear" ref={footer} />
        </Artwork>
        {!tv && <div class="cardOverlayContainer">
          <div class="cardOverlayButton-br flex" ref={buttons} />
        </div>}
      </div>
      <div class="cardTextStack">
        <div class="cardText cardText-first">
          {tv ? movie.Name : <a class="itemAction textActionButton" data-action="link" href={href} title={movie.Name}>{movie.Name}</a>}
        </div>
        <div class="cardText cardText-secondary sleekfin-meta"><Meta values={cardFacts(movie, 'Movie', '')} /></div>
      </div>
      <span class="sleekfin-details-playlist-position sleekfin-details-episode-number sleekfin-control-3d" />
    </div>
  );
}

function artworkUrl(mediaItem, shape) {
  const options = { maxWidth: shape === 'landscape' ? 800 : 480, quality: 90 };
  const primary = item.imageUrl(mediaItem, 'Primary', options);
  if (shape === 'landscape') {
    return item.imageUrl(mediaItem, 'Thumb', options) || item.imageUrl(mediaItem, 'Backdrop', { ...options, inherit: true }) || primary;
  }
  if (primary) return primary;
  const [id, tag] = [
    [mediaItem.AlbumId, mediaItem.AlbumPrimaryImageTag],
    [mediaItem.SeriesId, mediaItem.SeriesPrimaryImageTag],
    [mediaItem.ParentPrimaryImageItemId, mediaItem.ParentPrimaryImageTag],
  ].find(([id, tag]) => id && tag) || [];
  return item.imageUrl({ Id: id, ImageTags: { Primary: tag } }, 'Primary', options);
}

export function createPlaylist(page, { client, id: playlistId, compactEpisodes, onFacts }) {
  const list = page.querySelector('#listChildrenCollapsible #childrenContent > .itemsContainer');
  if (!list) return null;

  const heading = dom.element('<div class="sleekfin-section-heading sleekfin-details-section-heading"></div>');
  const rows = new Map();
  const controls = new Map();
  const detailedResults = new WeakSet();
  const previousAfterRefresh = list.afterRefresh;
  let nativeFetch;
  let sortable;
  let sortableTv;
  let nativeSortOptions;
  let items = null;
  let requested = false;
  let destroyed = false;

  list.classList.add('sleekfin-details-playlist-items');
  render(<SectionHeading title="Playlist items" contentsOnly />, heading);

  function fitMovieMetadata() {
    list.querySelectorAll('.sleekfin-details-playlist-movie .sleekfin-meta').forEach(fitMetadata);
  }

  const resizeObserver = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(fitMovieMetadata) : null;
  resizeObserver?.observe(list);
  if (!resizeObserver) window.addEventListener('resize', fitMovieMetadata);

  function fetchItems(options) {
    return client.getJSON(client.getUrl(`Playlists/${playlistId}/Items`, {
      Fields: 'PrimaryImageAspectRatio,MediaSourceCount,Chapters,Trickplay,Overview',
      EnableImageTypes: 'Primary,Backdrop,Banner,Thumb,Logo',
      UserId: client.getCurrentUserId(),
      ...options,
    })).then((result) => {
      detailedResults.add(result);
      return result;
    });
  }

  function attachFetch() {
    if (!client || !list.fetchData || list.fetchData === fetchItems) return;
    nativeFetch = list.fetchData;
    list.fetchData = fetchItems;
  }

  function applyItems(result) {
    const entries = result?.Items ?? result;
    if (!Array.isArray(entries)) return;
    items = new Map(entries.map((entry) => [entry.Id, entry]));
    const runTimeTicks = entries.reduce((total, entry) => total + (entry.RunTimeTicks || 0), 0);
    onFacts(entries.length, runTimeTicks);
    reconcile();
  }

  function afterRefresh(result) {
    const value = previousAfterRefresh?.call(this, result);
    if (destroyed) return value;
    attachFetch();
    const entries = result?.Items ?? result;
    // Jellyfin's first refresh can already be in flight when the richer request is attached.
    const enrich = list.fetchData === fetchItems && !detailedResults.has(result) && entries?.some((entry) => entry.Type === 'Episode');
    applyItems(result);
    if (enrich) {
      const snapshot = items;
      fetchItems().then((details) => {
        if (!destroyed && items === snapshot) applyItems(details);
      }).catch(() => { /* The native result still supplies the episode title and artwork. */ });
    }
    return value;
  }

  function restoreRow(row, record) {
    if (record.nativeChildren) {
      render(null, row);
      (record.nativeRow || row).replaceChildren(...record.nativeChildren);
      if (record.nativeRow) row.replaceWith(record.nativeRow);
      if (record.movie) row.classList.remove(...MOVIE_CARD_CLASSES);
      else row.classList.remove('sleekfin-details-playlist-episode');
    }
    record.artwork?.remove();
    record.position?.remove();
    record.titleLink?.replaceWith(...record.titleLink.childNodes);
    delete row.dataset.sleekfinPlaylistShape;
  }

  function restoreSortOptions() {
    if (list.sortable === sortable && nativeSortOptions) Object.entries(nativeSortOptions).forEach(([name, value]) => sortable.option(name, value));
  }

  function reconcile() {
    if (!page.contains(list)) return;
    attachFetch();
    const tv = document.documentElement.classList.contains('layout-tv');
    if (list.sortable !== sortable || tv !== sortableTv) {
      restoreSortOptions();
      sortable = list.sortable;
      sortableTv = tv;
      const editable = typeof sortable?.option === 'function' && !tv;
      list.classList.toggle('sleekfin-details-playlist-editable', editable);
      nativeSortOptions = editable ? Object.fromEntries(Object.keys(SORT_OPTIONS).map((name) => [name, sortable.option(name)])) : null;
      if (editable) Object.entries(SORT_OPTIONS).forEach(([name, value]) => sortable.option(name, value));
    }
    const entries = list.querySelectorAll(':scope > .listItem:not(.sortable-fallback)');
    if (entries.length) {
      if (heading.nextElementSibling !== list) list.before(heading);
    } else heading.remove();

    // Restored pages can already have rows before the native refresh callback is attached.
    if (entries.length && !items && !requested && typeof list.fetchData === 'function') {
      requested = true;
      list.fetchData().then((result) => { if (!destroyed && !items) applyItems(result); })
        .catch(() => { /* Jellyfin's own thumbnails are still available. */ });
    }

    rows.forEach((record, row) => {
      if (list.contains(row)) return;
      restoreRow(row, record);
      rows.delete(row);
    });
    entries.forEach((row) => {
      const mediaItem = items?.get(row.dataset.id);
      let record = rows.get(row);
      if (row.dataset.type === 'Movie') {
        if (!mediaItem) return;
        if (!record) {
          const playlistControls = row.querySelector(':scope > .listViewUserDataButtons');
          if (!playlistControls) return;
          const nativeArtwork = row.querySelector(':scope > .listItemImage');
          record = { movie: true, nativeChildren: Array.from(row.childNodes), nativeArtwork, playlistControls };
          row.classList.add(...MOVIE_CARD_CLASSES);
          row.replaceChildren();
          rows.set(row, record);
        }
        if (record.mediaItem !== mediaItem) {
          record.mediaItem = mediaItem;
          render(<MovieCard movie={mediaItem} nativeArtwork={record.nativeArtwork} playlistControls={record.playlistControls} tv={row.tagName === 'BUTTON'} />, row);
          fitMetadata(row.querySelector('.sleekfin-meta'));
        }
        return;
      }
      if (row.dataset.type === 'Episode') {
        if (!mediaItem) return;
        const restoreFocus = !record && row === document.activeElement;
        if (!record) {
          const nativeChildren = Array.from(row.childNodes);
          const playlistControls = row.querySelector(':scope > .listViewUserDataButtons');
          if (!playlistControls) return;
          record = { nativeChildren, playlistControls };
          if (row.tagName === 'BUTTON') {
            record.nativeRow = row;
            row = document.createElement('div');
            Array.from(record.nativeRow.attributes).forEach(({ name, value }) => row.setAttribute(name, value));
            row.classList.remove('itemAction', 'listItem-button');
            record.nativeRow.replaceWith(row);
          } else row.replaceChildren();
          row.classList.add('sleekfin-details-playlist-episode');
          row.dataset.sleekfinPlaylistShape = 'landscape';
          rows.set(row, record);
        }
        if (record.mediaItem !== mediaItem || record.compact !== compactEpisodes) {
          record.mediaItem = mediaItem;
          record.compact = compactEpisodes;
          render(<EpisodeCard episode={mediaItem} expanded={!compactEpisodes} playlistControls={record.playlistControls} />, row);
          if (restoreFocus) row.querySelector('.sleekfin-details-episode-action')?.focus();
        }
        return;
      }
      if (!record) {
        const shape = POSTER_TYPES.has(row.dataset.type) ? 'poster' : row.dataset.mediatype === 'Video' ? 'landscape' : 'square';
        row.dataset.sleekfinPlaylistShape = shape;
        const position = dom.element('<span class="sleekfin-details-playlist-position sleekfin-details-episode-number sleekfin-control-3d"></span>');
        row.appendChild(position);
        const title = row.querySelector(':scope > .listItemBody > .listItemBodyText > bdi');
        let titleLink = null;
        if (title && row.tagName !== 'BUTTON') {
          titleLink = dom.element('<a class="sleekfin-details-playlist-title itemAction" data-action="link"></a>');
          const { id, serverid } = row.dataset;
          titleLink.href = `#/details?id=${encodeURIComponent(id)}&serverId=${encodeURIComponent(serverid)}`;
          title.before(titleLink);
          titleLink.appendChild(title);
        }
        record = { shape, position, titleLink, artwork: null, mediaItem: null };
        rows.set(row, record);
      }
      if (!mediaItem || record.mediaItem === mediaItem) return;
      record.mediaItem = mediaItem;
      const image = row.querySelector(':scope > .listItemImage');
      const url = image && artworkUrl(mediaItem, record.shape);
      if (!url) {
        record.artwork?.remove();
        record.artwork = null;
        return;
      }
      if (!record.artwork) {
        const artwork = dom.element('<img class="sleekfin-details-playlist-artwork" loading="lazy" decoding="async" alt="">');
        artwork.onerror = () => { artwork.hidden = true; };
        image.prepend(artwork);
        record.artwork = artwork;
      }
      if (record.artwork.getAttribute('src') !== url) {
        record.artwork.hidden = false;
        record.artwork.src = url;
      }
    });

    controls.forEach((classes, button) => {
      if (list.contains(button)) return;
      button.classList.remove(...classes);
      controls.delete(button);
    });
    list.querySelectorAll(':scope > .listItem:not([data-type="Movie"]) .listViewUserDataButtons > .listItemButton').forEach((button) => {
      if (controls.has(button)) return;
      const classes = ['sleekfin-icon-button', 'sleekfin-control-3d'].filter((name) => !button.classList.contains(name));
      button.classList.add(...classes);
      controls.set(button, classes);
    });
  }

  list.afterRefresh = afterRefresh;
  return {
    reconcile,
    update(compact) {
      if (compactEpisodes === compact) return;
      compactEpisodes = compact;
      reconcile();
    },
    destroy() {
      destroyed = true;
      resizeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener('resize', fitMovieMetadata);
      if (list.afterRefresh === afterRefresh) list.afterRefresh = previousAfterRefresh;
      if (list.fetchData === fetchItems) list.fetchData = nativeFetch;
      restoreSortOptions();
      list.classList.remove('sleekfin-details-playlist-items', 'sleekfin-details-playlist-editable');
      render(null, heading);
      heading.remove();
      rows.forEach((record, row) => restoreRow(row, record));
      controls.forEach((classes, button) => button.classList.remove(...classes));
    },
  };
}
