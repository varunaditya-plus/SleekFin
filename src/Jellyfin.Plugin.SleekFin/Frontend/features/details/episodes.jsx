import { Fragment, h, Icon, IconButton, item, dom, render, SectionHeading, useEffect, useMemo, useRef, useState } from '../../shared/runtime.js';

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

function seasonKeyboardKey(event) {
  if (event.key === 'Spacebar') return ' ';
  if (event.key) return event.key;
  const keyCode = event.keyCode || event.which;
  const specialKeys = {
    9: 'Tab',
    13: 'Enter',
    27: 'Escape',
    32: ' ',
    35: 'End',
    36: 'Home',
    38: 'ArrowUp',
    40: 'ArrowDown',
  };
  if (specialKeys[keyCode]) return specialKeys[keyCode];
  const characterCode = keyCode >= 96 && keyCode <= 105 ? keyCode - 48 : keyCode;
  return (characterCode >= 48 && characterCode <= 57) || (characterCode >= 65 && characterCode <= 90)
    ? String.fromCharCode(characterCode).toLowerCase()
    : '';
}

function Episodes({ client, list, mediaItem, seasons }) {
  const firstSeason = useMemo(() => seasons.filter((season) => Number(season.IndexNumber) > 0)[0] || seasons[0] || null, [seasons]);
  const [episodes, setEpisodes] = useState([]);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [seasonMenuOpen, setSeasonMenuOpen] = useState(false);
  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);
  const [selectedSeasonId, setSelectedSeasonId] = useState(firstSeason?.Id || '');
  const [sortDescending, setSortDescending] = useState(false);
  const [status, setStatus] = useState(firstSeason ? 'loading' : 'error');
  const [view, setView] = useState('grid');
  const requestGeneration = useRef(0);
  const searchInput = useRef(null);
  const seasonSelect = useRef(null);
  const seasonMenu = useRef(null);
  const seasonMenuRoot = useRef(null);
  const seasonSearch = useRef('');
  const seasonSearchTimer = useRef(0);
  const selectedSeasonIndex = Math.max(0, seasons.map((season) => String(season.Id)).indexOf(String(selectedSeasonId)));
  const selectedSeason = seasons[selectedSeasonIndex];
  const selectedSeasonLabel = selectedSeason ? seasonLabel(selectedSeason) : 'Seasons';
  const activeIndex = Math.max(0, Math.min(seasons.length - 1, activeSeasonIndex));
  const seasonMenuId = `sleekfin-season-menu-${mediaItem.Id}`;

  useEffect(() => {
    if (searchOpen) {
      searchInput.current?.focus();
    }
  }, [searchOpen]);

  useEffect(() => () => window.clearTimeout(seasonSearchTimer.current), []);

  useEffect(() => {
    if (!seasonMenuOpen) return undefined;
    // The detail wrapper stacks below the hero, so the listbox must live outside it.
    const root = document.createElement('div');
    root.className = 'sleekfin-details-season-layer';
    document.body.appendChild(root);
    seasonMenuRoot.current = root;
    return () => {
      render(null, root);
      root.remove();
      seasonMenuRoot.current = null;
      seasonMenu.current = null;
    };
  }, [seasonMenuOpen]);

  useEffect(() => {
    const root = seasonMenuRoot.current;
    if (!seasonMenuOpen || !root) return;
    render(
      <div
        aria-label="Seasons"
        class="sleekfin-details-season-menu sleekfin-control-3d"
        data-placement="below"
        data-positioned="false"
        id={seasonMenuId}
        ref={seasonMenu}
        role="listbox"
      >
        {seasons.map((season, index) => (
          <div
            aria-selected={index === activeIndex}
            class="sleekfin-details-season-option"
            data-active={index === activeIndex ? 'true' : 'false'}
            data-selected={index === selectedSeasonIndex ? 'true' : 'false'}
            id={`${seasonMenuId}-option-${index}`}
            key={season.Id}
            onClick={() => chooseSeason(season, index)}
            onMouseMove={() => setActiveSeasonIndex(index)}
            role="option"
          >
            <span>{seasonLabel(season)}</span>
          </div>
        ))}
      </div>,
      root,
    );
  }, [activeIndex, seasonMenuId, seasonMenuOpen, seasons, selectedSeasonIndex]);

  useEffect(() => {
    if (!seasonMenuOpen) return undefined;
    function closeSeasonMenu(event) {
      if (!seasonSelect.current?.contains(event.target) && !seasonMenu.current?.contains(event.target)) {
        setSeasonMenuOpen(false);
      }
    }

    function updateSeasonMenuPlacement() {
      const trigger = seasonSelect.current?.querySelector('.sleekfin-details-season-trigger');
      const menu = seasonMenu.current;
      if (!trigger || !menu) return;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const maxMenuHeight = Math.min(420, window.innerHeight * 0.5);
      const menuContentHeight = menu.scrollHeight + (menu.offsetHeight - menu.clientHeight);
      const menuHeight = Math.min(menuContentHeight, maxMenuHeight);
      const menuWidth = menuRect.width;
      const spaceBelow = Math.max(0, window.innerHeight - triggerRect.bottom - 8);
      const spaceAbove = Math.max(0, triggerRect.top - 8);
      const placement = menuHeight > spaceBelow && spaceAbove > spaceBelow ? 'above' : 'below';
      const availableSpace = placement === 'above' ? spaceAbove : spaceBelow;
      const maxHeight = Math.floor(Math.min(maxMenuHeight, availableSpace));
      const maxWidth = Math.min(360, window.innerWidth * 0.7);
      const minWidth = Math.min(triggerRect.width, maxWidth);
      const width = Math.max(minWidth, Math.min(menuWidth, maxWidth));
      const left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - width - 8));
      const visibleHeight = Math.min(menuHeight, maxHeight);
      const top = placement === 'above' ? Math.max(8, triggerRect.top - visibleHeight - 6) : triggerRect.bottom + 6;
      // Keep portal positioning synchronous with scroll so it does not trail the moving trigger.
      menu.dataset.placement = placement;
      menu.style.left = `${left}px`;
      menu.style.maxHeight = `${maxHeight}px`;
      menu.style.minWidth = `${minWidth}px`;
      menu.style.top = `${top}px`;
      menu.dataset.positioned = 'true';
    }

    document.addEventListener('mousedown', closeSeasonMenu);
    document.addEventListener('touchstart', closeSeasonMenu);
    window.addEventListener('resize', updateSeasonMenuPlacement);
    window.addEventListener('scroll', updateSeasonMenuPlacement, true);
    updateSeasonMenuPlacement();
    return () => {
      document.removeEventListener('mousedown', closeSeasonMenu);
      document.removeEventListener('touchstart', closeSeasonMenu);
      window.removeEventListener('resize', updateSeasonMenuPlacement);
      window.removeEventListener('scroll', updateSeasonMenuPlacement, true);
      window.clearTimeout(seasonSearchTimer.current);
      seasonSearch.current = '';
    };
  }, [seasonMenuOpen, seasons.length]);

  useEffect(() => {
    if (seasonMenuOpen) {
      seasonMenu.current?.children[activeIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, seasonMenuOpen]);

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

  function chooseSeason(season, index) {
    setSelectedSeasonId(String(season.Id));
    setActiveSeasonIndex(index);
    setSeasonMenuOpen(false);
  }

  function openSeasonMenu(index, preserveSearch = false) {
    if (!preserveSearch) {
      window.clearTimeout(seasonSearchTimer.current);
      seasonSearch.current = '';
    }
    setActiveSeasonIndex(index);
    setSeasonMenuOpen(true);
  }

  function toggleSeasonMenu() {
    if (seasonMenuOpen) {
      setSeasonMenuOpen(false);
    } else if (seasons.length) {
      openSeasonMenu(selectedSeasonIndex);
    }
  }

  function handleSeasonKeyDown(event) {
    const key = seasonKeyboardKey(event);
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      if (!seasonMenuOpen) {
        openSeasonMenu(selectedSeasonIndex);
      } else {
        const offset = key === 'ArrowDown' ? 1 : -1;
        setActiveSeasonIndex((index) => Math.max(0, Math.min(seasons.length - 1, Math.min(index, activeIndex) + offset)));
      }
    } else if (seasonMenuOpen && key === 'Home') {
      event.preventDefault();
      setActiveSeasonIndex(0);
    } else if (seasonMenuOpen && key === 'End') {
      event.preventDefault();
      setActiveSeasonIndex(seasons.length - 1);
    } else if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (seasonMenuOpen) {
        const season = seasons[activeIndex];
        if (season) chooseSeason(season, activeIndex);
      } else {
        toggleSeasonMenu();
      }
    } else if (seasonMenuOpen && key === 'Escape') {
      event.preventDefault();
      setActiveSeasonIndex(selectedSeasonIndex);
      setSeasonMenuOpen(false);
    } else if (seasonMenuOpen && key === 'Tab') {
      const season = seasons[activeIndex];
      if (season) chooseSeason(season, activeIndex);
    } else if (key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && seasons.length) {
      event.preventDefault();
      const character = key.toLocaleLowerCase();
      const repeatedCharacter = seasonSearch.current && seasonSearch.current.split('').every((value) => value === character);
      const search = repeatedCharacter ? character : `${seasonSearch.current}${character}`;
      seasonSearch.current = search;
      window.clearTimeout(seasonSearchTimer.current);
      seasonSearchTimer.current = window.setTimeout(() => {
        seasonSearch.current = '';
      }, 700);
      const startIndex = repeatedCharacter ? (activeIndex + 1) % seasons.length : activeIndex;
      for (let offset = 0; offset < seasons.length; offset += 1) {
        const index = (startIndex + offset) % seasons.length;
        if (seasonLabel(seasons[index]).toLocaleLowerCase().slice(0, search.length) === search) {
          if (seasonMenuOpen) {
            setActiveSeasonIndex(index);
          } else {
            openSeasonMenu(index, true);
          }
          break;
        }
      }
    }
  }

  let title;
  if (mediaItem.Type === 'Series') {
    title = (
      <span class="sleekfin-details-season-select" ref={seasonSelect} data-open={seasonMenuOpen ? 'true' : 'false'}>
        <button
          aria-activedescendant={seasonMenuOpen ? `${seasonMenuId}-option-${activeIndex}` : undefined}
          aria-controls={seasonMenuOpen ? seasonMenuId : undefined}
          aria-expanded={seasonMenuOpen}
          aria-haspopup="listbox"
          aria-label="Select season"
          class="sleekfin-details-season-trigger"
          disabled={!seasons.length}
          role="combobox"
          type="button"
          onClick={toggleSeasonMenu}
          onKeyDown={handleSeasonKeyDown}
        >
          {selectedSeasonLabel}
        </button>
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

export function createEpisodes(page, mediaItem, seasons) {
  const client = window.ApiClient;
  const wrapper = page.querySelector('.detailPageWrapperContainer');
  const secondary = page.querySelector('.detailPageSecondaryContainer');
  if (!client || !wrapper || !secondary) return null;

  const section = dom.element('<section class="sleekfin-details-episodes"><div class="sleekfin-details-episodes-header"></div><div is="emby-itemscontainer" class="sleekfin-details-episode-list" data-contextmenu="false" data-multiselect="false" data-view="grid"></div></section>');
  const header = section.firstElementChild;
  const list = section.lastElementChild;
  let destroyed = false;
  render(<Episodes client={client} list={list} mediaItem={mediaItem} seasons={seasons} />, header);
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
