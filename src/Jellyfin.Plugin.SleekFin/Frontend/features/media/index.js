import { dom } from '../../shared/runtime.js';
import { cleanupInactiveMetadata, cleanupMetadata, renderMetadata } from './metadata.jsx';

const MAIN_ROOT_CLASS = 'sleekfin-main-ui';
const ROOT_CLASS = 'sleekfin-media-mounted';
const PAGE_SELECTOR = '#indexPage, #moviesPage, #tvshowsPage, #tvRecommendedPage';
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.media?.stop?.();

const state = {
  cache: new Map(),
  generation: 0,
  inFlight: new Set(),
  stopped: true,
  stopWatching: null,
  timer: 0,
  userId: '',
};

function isCurrent(generation) {
  return !state.stopped && generation === state.generation;
}

function resetData() {
  state.generation += 1;
  state.cache.clear();
  state.inFlight.clear();
  state.userId = '';
}

function currentUserId() {
  const client = window.ApiClient;
  return client && typeof client.getCurrentUserId === 'function' ? client.getCurrentUserId() : '';
}

function syncUser() {
  const userId = currentUserId();
  if (state.userId !== userId) {
    resetData();
    state.userId = userId;
  }
  return userId;
}

function load(ids) {
  const client = window.ApiClient;
  const userId = syncUser();
  if (!client || typeof client.getItems !== 'function' || !userId) {
    schedule(250);
    return;
  }

  while (ids.length && !state.stopped) {
    const batch = ids.splice(0, 60);
    const generation = state.generation;
    batch.forEach((id) => state.inFlight.add(id));
    client
      .getItems(userId, {
        EnableTotalRecordCount: false,
        Ids: batch.join(','),
      })
      .then((response) => {
        if (!isCurrent(generation)) return;

        const items = new Map((response.Items || []).map((mediaItem) => [mediaItem.Id, mediaItem]));
        batch.forEach((id) => state.cache.set(id, items.get(id) || null));
      })
      .catch(() => {
        if (!isCurrent(generation)) return;

        batch.forEach((id) => state.cache.set(id, null));
      })
      .finally(() => {
        if (!isCurrent(generation)) return;

        batch.forEach((id) => state.inFlight.delete(id));
        schedule();
      });
  }
}

function reconcile() {
  window.clearTimeout(state.timer);
  state.timer = 0;
  if (state.stopped || !document.documentElement.classList.contains(ROOT_CLASS)) return;

  syncUser();
  const activeCards = new Set();
  const missing = [];
  document.querySelectorAll(PAGE_SELECTOR).forEach((page) => {
    if (!dom.isVisible(page)) return;

    page.querySelectorAll('.card[data-id][data-type]').forEach((card) => {
      const id = card.dataset.id;
      activeCards.add(card);
      renderMetadata(card, state.cache.get(id));
      if (!state.cache.has(id) && !state.inFlight.has(id)) {
        missing.push(id);
      }
    });
  });
  cleanupInactiveMetadata(activeCards);

  if (missing.length) {
    load(Array.from(new Set(missing)));
  }
}

function deactivate() {
  window.clearTimeout(state.timer);
  state.timer = 0;
  document.documentElement.classList.remove(ROOT_CLASS);
  cleanupMetadata(document);
  resetData();
}

function schedule(delay) {
  window.clearTimeout(state.timer);
  state.timer = 0;
  if (state.stopped) return;

  if (!document.documentElement.classList.contains(MAIN_ROOT_CLASS)) {
    deactivate();
    return;
  }

  document.documentElement.classList.add(ROOT_CLASS);
  state.timer = window.setTimeout(reconcile, typeof delay === 'number' ? delay : 40);
}

function start() {
  if (!state.stopped) return;

  state.stopped = false;
  state.stopWatching = dom.watchSpa(schedule, { events: ['hashchange', 'resize'] });
  schedule();
}

function stop() {
  if (state.stopped) return;

  state.stopped = true;
  state.stopWatching?.();
  state.stopWatching = null;
  deactivate();
}

features.media = { start, stop };
start();
