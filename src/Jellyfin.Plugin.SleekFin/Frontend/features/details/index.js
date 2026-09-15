import { dom } from '../../shared/runtime.js';
import { createActions } from './actions.js';
import { createEpisodes } from './episodes.jsx';
import { createHero } from './hero.jsx';
import { createSections } from './sections.jsx';
import { createSimilar } from './similar.jsx';

const SUPPORTED_TYPES = ['Movie', 'Series', 'Season', 'Episode'];
const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.details?.stop?.();

const state = {
  currentId: '',
  currentServerId: '',
  generation: 0,
  item: null,
  loadingId: '',
  mount: null,
  page: null,
  reconcileTimer: 0,
  retryTimer: 0,
  seasons: [],
  started: false,
  stopWatching: null,
};

function route() {
  const match = window.location.hash.match(/^#\/details\?([^#]*)/);
  const parameters = new URLSearchParams(match ? match[1] : '');
  return { id: parameters.get('id') || '', serverId: parameters.get('serverId') || '' };
}

function findPage(id) {
  if (!id) return null;
  return Array.from(document.querySelectorAll('#itemDetailPage')).find(dom.isVisible) || null;
}

function routeClient(serverId) {
  const client = window.ApiClient;
  if (!client || !serverId || typeof client.serverId !== 'function') return client;
  return String(client.serverId()).toLowerCase() === serverId.toLowerCase() ? client : null;
}

function loadSeasons(client, userId, mediaItem) {
  if (mediaItem.Type === 'Series') return client.getSeasons(mediaItem.Id, { userId });
  if (mediaItem.Type === 'Season') return Promise.resolve({ Items: [mediaItem] });
  if (mediaItem.Type === 'Episode' && mediaItem.SeasonId) return client.getItem(userId, mediaItem.SeasonId).then((season) => ({ Items: [season] }));
  return Promise.resolve({ Items: [] });
}

function destroyMount() {
  if (!state.mount) return;
  state.mount.episodes?.destroy();
  state.mount.similar.destroy();
  state.mount.sections.destroy();
  state.mount.actions.destroy();
  state.mount.hero.destroy();
  state.mount.page.removeAttribute('data-sleekfin-details');
  state.mount = null;
  document.documentElement.classList.remove('sleekfin-details-mounted');
}

function mount() {
  if (!state.page || !state.item || !SUPPORTED_TYPES.includes(state.item.Type)) return;
  const hero = createHero(state.page);
  if (!hero) return;
  const actions = createActions(hero.actions, state.item);
  const sections = createSections(state.page);
  const similar = createSimilar(state.page);
  const episodes = ['Series', 'Season', 'Episode'].includes(state.item.Type) && state.seasons.length ? createEpisodes(state.page, state.item, state.seasons) : null;

  state.mount = {
    actions,
    episodes,
    hero,
    page: state.page,
    sections,
    similar,
  };
  state.page.dataset.sleekfinDetails = 'true';
  document.documentElement.classList.add('sleekfin-details-mounted');
  hero.render(state.item, state.seasons);
  actions.reconcile();
  similar.render();
}

function load(id, serverId) {
  const client = routeClient(serverId);
  if (!client) {
    if (!window.ApiClient) {
      window.clearTimeout(state.retryTimer);
      state.retryTimer = window.setTimeout(scheduleReconcile, 250);
    }
    return;
  }

  const generation = state.generation;
  const userId = client.getCurrentUserId();
  state.loadingId = id;
  client.getItem(userId, id)
    .then((mediaItem) => {
      if (generation !== state.generation || id !== state.currentId) return null;
      state.item = mediaItem;
      scheduleReconcile();
      if (!SUPPORTED_TYPES.includes(state.item.Type)) return { Items: [] };
      return loadSeasons(client, userId, state.item);
    })
    .then((result) => {
      if (!result || generation !== state.generation || id !== state.currentId) return;
      state.seasons = result.Items || [];
      state.loadingId = '';
      if (state.mount) {
        state.mount.hero.render(state.item, state.seasons);
        if (!state.mount.episodes && ['Series', 'Season', 'Episode'].includes(state.item.Type) && state.seasons.length) {
          state.mount.episodes = createEpisodes(state.page, state.item, state.seasons);
        }
      }
      scheduleReconcile();
    })
    .catch(() => {
      if (generation === state.generation && id === state.currentId) {
        state.loadingId = '';
      }
    });
}

function select(page, id, serverId) {
  destroyMount();
  state.generation += 1;
  state.currentId = id;
  state.currentServerId = serverId;
  state.item = null;
  state.loadingId = '';
  state.page = page;
  state.seasons = [];
  load(id, serverId);
}

function reset() {
  destroyMount();
  state.generation += 1;
  state.currentId = '';
  state.currentServerId = '';
  state.item = null;
  state.loadingId = '';
  state.page = null;
  state.seasons = [];
}

function reconcile() {
  if (!state.started) return;
  const currentRoute = route();
  const { id, serverId } = currentRoute;
  const page = findPage(id);
  if (!page) {
    if (state.page || state.mount) {
      reset();
    }
    return;
  }
  if (state.page !== page || state.currentId !== id || state.currentServerId !== serverId) {
    select(page, id, serverId);
    return;
  }
  if (!state.item && !state.loadingId) {
    load(id, serverId);
    return;
  }
  if (!state.item || !SUPPORTED_TYPES.includes(state.item.Type)) {
    destroyMount();
    return;
  }
  if (!state.mount || !state.mount.hero.isConnected()) {
    destroyMount();
    mount();
    return;
  }
  state.mount.hero.sync();
  state.mount.actions.reconcile();
  state.mount.sections.reconcile();
  state.mount.similar.render();
}

function scheduleReconcile() {
  window.clearTimeout(state.reconcileTimer);
  state.reconcileTimer = window.setTimeout(reconcile, 80);
}

function start() {
  if (state.started) return;

  state.started = true;
  state.stopWatching = dom.watchSpa(scheduleReconcile, {
    events: WINDOW_EVENTS,
    viewshow: true,
  });
  scheduleReconcile();
}

function stop() {
  if (!state.started) return;

  state.started = false;
  window.clearTimeout(state.reconcileTimer);
  window.clearTimeout(state.retryTimer);
  state.stopWatching?.();
  state.stopWatching = null;
  reset();
}

features.details = { start, stop };
start();
