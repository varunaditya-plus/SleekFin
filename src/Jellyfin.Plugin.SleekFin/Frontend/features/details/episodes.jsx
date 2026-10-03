import { Fragment, h, Icon, IconButton, item, dom, render, SectionHeading, useEffect, useMemo, useRef, useState } from '../../shared/runtime.js';
import { createDropdown } from './dropdown.js';

function downloadEpisode(client, episode) {
  const link = document.createElement('a');
  link.href = client.getItemDownloadUrl(episode.Id);
  link.download = '';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function EpisodeCard({ client, episode }) {
  const score = Number(episode.CommunityRating || 0);
  const imageUrl = item.imageUrl(episode, 'Primary', { maxWidth: 840, quality: 90 });
  const action = item.actionAttributes(episode);
  const actionClass = action.class;
  delete action.class;

  return (
    <article class="sleekfin-details-episode">
      <button {...action} type="button" class={`sleekfin-details-episode-action ${actionClass}`}>
        {imageUrl && <img src={imageUrl} />}
        <span class="sleekfin-details-episode-shade" />
        <span class="sleekfin-details-episode-copy">
          <span class="sleekfin-details-episode-number">{`Episode ${episode.IndexNumber || ''}`}</span>
          <span class="sleekfin-details-episode-title">{episode.Name || ''}</span>
          <span class="sleekfin-details-episode-overview">{episode.Overview || ''}</span>
          <span class="sleekfin-details-episode-footer">
            <span>
              <Icon name="play" />
              {item.formatRuntime(episode.RunTimeTicks)}
            </span>
            {score > 0 && (
              <span class="sleekfin-details-episode-score">
                <Icon name="star" />
                {score.toFixed(1)}
              </span>
            )}
          </span>
        </span>
      </button>
      {episode.CanDownload && typeof client.getItemDownloadUrl === 'function' && (
        <IconButton class="sleekfin-details-episode-download" icon="download" label="Download" raised strokeWidth={1.75} onClick={() => downloadEpisode(client, episode)} />
      )}
    </article>
  );
}

function seasonLabel(season) {
  return season.Name || `Season ${season.IndexNumber || ''}`;
}

function Episodes({ client, list, mediaItem, seasons, seasonPickerEnabled }) {
  const firstSeason = useMemo(() => seasons.filter((season) => Number(season.IndexNumber) > 0)[0] || seasons[0] || null, [seasons]);
  const [episodes, setEpisodes] = useState([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState(firstSeason?.Id || '');
  const [sortDescending, setSortDescending] = useState(false);
  const [status, setStatus] = useState(firstSeason ? 'loading' : 'error');
  const [view, setView] = useState('grid');
  const requestGeneration = useRef(0);
  const searchInput = useRef(null);
  const seasonSelect = useRef(null);
  const seasonDropdown = useRef(null);
  const selectedSeasonIndex = Math.max(0, seasons.map((season) => String(season.Id)).indexOf(String(selectedSeasonId)));
  const selectedSeason = seasons[selectedSeasonIndex];
  const selectedSeasonLabel = selectedSeason ? seasonLabel(selectedSeason) : 'Seasons';

  useEffect(() => {
    if (searchOpen) {
      searchInput.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => {
    if (!seasonPickerEnabled) return undefined;
    const root = seasonSelect.current;
    const trigger = root?.querySelector('.sleekfin-details-season-trigger');
    if (!root || !trigger) return undefined;
    const dropdown = createDropdown({
      root,
      trigger,
      maxWidth: 360,
      options: seasons.map((season) => ({ value: season.Id, label: seasonLabel(season) })),
      value: selectedSeasonId,
      onSelect: (option) => setSelectedSeasonId(option.value),
    });
    seasonDropdown.current = dropdown;
    return () => {
      dropdown.destroy();
      if (seasonDropdown.current === dropdown) seasonDropdown.current = null;
    };
  }, [mediaItem.Id, seasonPickerEnabled]);

  useEffect(() => {
    seasonDropdown.current?.update(
      seasons.map((season) => ({ value: season.Id, label: seasonLabel(season) })),
      selectedSeasonId,
    );
  }, [seasonPickerEnabled, seasons, selectedSeasonId]);

  useEffect(() => {
    const seriesId = mediaItem.Type === 'Series' ? mediaItem.Id : mediaItem.SeriesId;
    const generation = ++requestGeneration.current;
    if (!seriesId || !selectedSeasonId) {
      setEpisodes([]);
      setStatus('error');
      return undefined;
    }

    setEpisodes([]);
    setStatus('loading');
    client
      .getEpisodes(seriesId, {
        seasonId: selectedSeasonId,
        userId: client.getCurrentUserId(),
        Fields: 'Overview,CanDownload',
        EnableImages: true,
        EnableUserData: true,
      })
      .then((result) => {
        if (generation !== requestGeneration.current) return;
        setEpisodes(result.Items || []);
        setStatus('ready');
      })
      .catch(() => {
        if (generation !== requestGeneration.current) return;
        setEpisodes([]);
        setStatus('error');
      });

    return () => {
      if (generation === requestGeneration.current) {
        requestGeneration.current += 1;
      }
    };
  }, [client, mediaItem, selectedSeasonId]);

  const visibleEpisodes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    const filtered = episodes.filter(
      (episode) =>
        !normalizedQuery || (episode.Name || '').toLocaleLowerCase().includes(normalizedQuery) || (episode.Overview || '').toLocaleLowerCase().includes(normalizedQuery) || String(episode.IndexNumber || '').includes(normalizedQuery),
    );
    return sortDescending ? filtered.reverse() : filtered;
  }, [episodes, query, sortDescending]);

  useEffect(() => {
    list.dataset.view = view;
    render(
      <Fragment>
        {visibleEpisodes.map((episode) => (
          <EpisodeCard client={client} episode={episode} key={episode.Id} />
        ))}
      </Fragment>,
      list,
    );
    if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
      window.CustomElements.upgradeSubtree(list);
    }
  }, [client, list, view, visibleEpisodes]);

  const subtitle = status === 'loading' ? 'Loading episodes' : status === 'error' ? 'Episodes unavailable' : `${visibleEpisodes.length}${visibleEpisodes.length === 1 ? ' episode' : ' episodes'}`;

  let title;
  if (mediaItem.Type === 'Series') {
    title = seasonPickerEnabled ? (
      <span class="sleekfin-details-season-select" ref={seasonSelect}>
        <button
          aria-haspopup="listbox"
          aria-label="Select season"
          class="sleekfin-details-season-trigger"
          disabled={!seasons.length}
          role="combobox"
          type="button"
        >
          {selectedSeasonLabel}
        </button>
      </span>
    ) : (
      <span class="sleekfin-details-season-select">
        <select class="sleekfin-details-season-native" value={selectedSeasonId} onChange={(event) => setSelectedSeasonId(event.currentTarget.value)}>
          {seasons.map((season) => (
            <option value={season.Id} key={season.Id}>
              {seasonLabel(season)}
            </option>
          ))}
        </select>
      </span>
    );
  } else {
    const currentSeason = seasons[0];
    title = <h2 class="sleekfin-details-season-title">{mediaItem.Type === 'Episode' ? `More from ${currentSeason?.Name || 'this season'}` : currentSeason?.Name || 'Episodes'}</h2>;
  }

  function toggleSearch() {
    setSearchOpen((open) => {
      if (open) {
        setQuery('');
      }
      return !open;
    });
  }

  return (
    <Fragment>
      <SectionHeading title={title} subtitle={subtitle} />
      <div class="sleekfin-details-episode-controls">
        <div class={`sleekfin-details-search sleekfin-control-3d${searchOpen ? ' sleekfin-details-search-open' : ''}`}>
          <IconButton icon="search" label="Search episodes" onClick={toggleSearch} />
          <input ref={searchInput} type="search" placeholder="Search episodes" value={query} onInput={(event) => setQuery(event.currentTarget.value)} />
        </div>
        <IconButton class="sleekfin-details-control" icon={sortDescending ? 'arrowUpAz' : 'arrowDownAz'} label="Reverse episode order" raised data-active={sortDescending ? 'true' : 'false'} onClick={() => setSortDescending((descending) => !descending)} />
        <span class="sleekfin-details-view-controls sleekfin-control-3d">
          <IconButton class="sleekfin-details-control" icon="grid" label="Grid view" data-view="grid" data-active={view === 'grid' ? 'true' : 'false'} onClick={() => setView('grid')} />
          <IconButton class="sleekfin-details-control" icon="list" label="List view" data-view="list" data-active={view === 'list' ? 'true' : 'false'} onClick={() => setView('list')} />
        </span>
      </div>
    </Fragment>
  );
}

export function createEpisodes(page, mediaItem, seasons, seasonPickerEnabled) {
  const client = window.ApiClient;
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const secondary = page.querySelector('.detailPageSecondaryContainer');
  if (!client || !wrapper || !secondary) return null;

  const section = dom.element('<section class="sleekfin-details-episodes"><div class="sleekfin-details-episodes-header"></div><div is="emby-itemscontainer" class="sleekfin-details-episode-list" data-contextmenu="false" data-multiselect="false" data-view="grid"></div></section>');
  const header = section.firstElementChild;
  const list = section.lastElementChild;
  let destroyed = false;
  render(<Episodes client={client} list={list} mediaItem={mediaItem} seasons={seasons} seasonPickerEnabled={seasonPickerEnabled} />, header);
  wrapper.insertBefore(section, secondary);

  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      render(null, list);
      render(null, header);
      section.remove();
    },
  };
}
