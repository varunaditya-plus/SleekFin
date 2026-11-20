import { normalizeSettings } from './settings.js';

const ITEM_QUERIES = {
  ContinueWatching: { Filters: 'IsResumable', IncludeItemTypes: 'Movie,Episode', SortBy: 'DatePlayed', SortOrder: 'Descending' },
  LatestMovies: { IncludeItemTypes: 'Movie', SortBy: 'DateCreated', SortOrder: 'Descending' },
  LatestShows: { IncludeItemTypes: 'Series', SortBy: 'DateCreated', SortOrder: 'Descending' },
  Favorites: { Filters: 'IsFavorite', IncludeItemTypes: 'Movie,Series', SortBy: 'SortName', SortOrder: 'Ascending' },
};

export function loadSettings(client) {
  return client.ajax({
    type: 'GET',
    url: client.getUrl('SleekFin/Hero/Settings'),
    dataType: 'json',
  }).then(normalizeSettings);
}

function loadSource(client, source, options) {
  const userId = client.getCurrentUserId();
  const request = source === 'NextUp'
    ? client.getNextUpEpisodes({ ...options, UserId: userId })
    : client.getItems(userId, { ...options, ...ITEM_QUERIES[source], Recursive: true });
  return request.then((result) => result.Items || []);
}

function shuffle(items) {
  const shuffled = items.slice();
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const value = shuffled[index];
    shuffled[index] = shuffled[randomIndex];
    shuffled[randomIndex] = value;
  }
  return shuffled;
}

function collect(client, settings) {
  const options = { EnableTotalRecordCount: false, Fields: 'Overview,Genres' };
  if (settings.slidesShown !== -1) options.Limit = 10;
  return Promise.all(settings.contentOrder.map((source) => loadSource(client, source, options).catch(() => []))).then((sources) => {
    const seen = new Set();
    const items = [];
    sources.forEach((sourceItems) => {
      sourceItems.forEach((item) => {
        const identity = item.Type === 'Episode' && item.SeriesId ? item.SeriesId : item.Id;
        if (identity && !seen.has(identity)) {
          seen.add(identity);
          items.push(item);
        }
      });
    });
    const ordered = settings.randomized ? shuffle(items) : items;
    return settings.slidesShown === -1 ? ordered : ordered.slice(0, settings.slidesShown);
  });
}

function prepare(client, item) {
  const displayPromise = item.Type === 'Episode' && item.SeriesId ? client.getItem(client.getCurrentUserId(), item.SeriesId).catch(() => item) : Promise.resolve(item);
  return displayPromise.then((displayItem) => ({ display: displayItem, play: item }));
}

export function loadEntries(client, settings) {
  return collect(client, settings).then((items) => {
    if (settings.slidesShown !== -1) return Promise.all(items.map((item) => prepare(client, item)));
    return items.map((item) => {
      if (item.Type !== 'Episode' || !item.SeriesId) return { display: item, play: item };
      let prepared;
      return { play: item, load: () => (prepared ||= prepare(client, item)) };
    });
  });
}
