import { dom, h, render } from '../../shared/runtime.js';
import { Hero } from './Hero.jsx';
import { loadEntries, loadSettings } from './source.js';

const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.hero?.stop?.();

// Jellyfin upgrades the customized items container from the `is` attribute, so the element that
// becomes the container has to be created with that attribute already present.
const ROOT_MARKUP = '<div is="emby-itemscontainer" class="sleekfin-hero itemsContainer" data-contextmenu="false" data-multiselect="false"></div>';

const state = {
  generation: 0,
  mount: null,
  reconcileScheduled: false,
  reservation: null,
  reservedHost: null,
  resolvedHost: null,
  started: false,
  stopWatching: null,
};

function isHomeRoute() {
  const match = window.location.hash.match(/^#\/(?:home)?(?:\?([^#]*))?$/);
  if (!match) return false;

  const tab = new URLSearchParams(match[1] || '').get('tab');
  return !tab || tab === '0';
}

// Jellyfin fills the sections container asynchronously, so it is empty and therefore zero-height
// until the first row renders. A geometry check here would reject the one host the hero slot has to
// precede, and the rows would jump once the slot finally arrived. The hide checks stay, so the hero
// is still never placed into a home tab that Jellyfin is keeping hidden.
function findHost() {
  if (!isHomeRoute()) return null;
  return (
    Array.from(document.querySelectorAll('#indexPage #homeTab.is-active .sections')).find((candidate) => {
      if (!dom.isConnected(candidate)) return false;
      const style = window.getComputedStyle(candidate);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }) || null
  );
}

function removeReservation() {
  if (!state.reservation) return;
  state.reservation.remove();
  state.reservation = null;
  state.reservedHost = null;
}

function removeMount() {
  if (!state.mount) return;
  render(null, state.mount);
  state.mount.remove();
  state.mount = null;
}

function unmount() {
  state.generation += 1;
  removeMount();
  removeReservation();
  state.resolvedHost = null;
}

// The hero arrives only after settings and items resolve, but it is taller than a viewport, so
// inserting it then drags every row below it down the page. An empty slot carries the same styling
// class, so it is exactly as tall as the hero and inherits the same offset under the fixed header,
// and it holds that space from the start of the round trip. The hero takes the slot's place in the
// same frame it lands, so nothing below it moves.
function reserve(host) {
  const reservation = dom.element('<div class="sleekfin-hero"></div>');
  state.reservation = reservation;
  state.reservedHost = host;
  host.parentNode.insertBefore(reservation, host);
}

function renderHero(host, entries) {
  try {
    const reservation = state.reservation;
    removeReservation();
    if (!entries.length || !dom.isConnected(host) || !isHomeRoute()) return;

    const root = dom.element(ROOT_MARKUP);
    render(h(Hero, { entries, root }), root);
    // The slot and the hero each occupy the hero's full height, so the slot has to leave in the same
    // step the hero arrives. Between those two lines the page would measure a hero taller than itself.
    host.parentNode.insertBefore(root, host);
    reservation.remove();
    state.mount = root;
    if (window.CustomElements && typeof window.CustomElements.upgradeSubtree === 'function') {
      window.CustomElements.upgradeSubtree(root);
    }
  } finally {
    // Records that this host has had its answer, so an empty result is not re-fetched on every
    // mutation of the home page. A later home remount produces a new host and a fresh attempt.
    state.resolvedHost = host;
  }
}

function mount(host) {
  const client = window.ApiClient;
  const generation = ++state.generation;
  reserve(host);
  loadSettings(client)
    .then((settings) => loadEntries(client, settings))
    .then((entries) => {
      if (generation !== state.generation) return;
      renderHero(host, entries);
    })
    .catch(() => {
      if (generation === state.generation) removeReservation();
    });
}

function reconcile() {
  if (!state.started || !window.ApiClient) return;

  const host = findHost();
  if (!host) {
    unmount();
    return;
  }
  if (state.mount && dom.isConnected(state.mount) && state.mount.nextElementSibling === host) return;
  if (state.reservedHost === host && dom.isConnected(state.reservation)) return;
  if (state.resolvedHost === host) return;

  unmount();
  mount(host);
}

// The browserslist target includes Chrome 49-70 and Edge 18, which have no queueMicrotask, and the
// build transpiles syntax rather than polyfilling APIs. Falling back to a timeout keeps the deferred
// reconcile available instead of throwing inside the observer callback.
const defer =
  typeof window.queueMicrotask === 'function'
    ? window.queueMicrotask.bind(window)
    : (callback) => window.setTimeout(callback, 0);

// The home page mutates continuously while it assembles, so any debounce defers this past the first
// row, and the slot then arrives as a jump. Reacting to the observer's batch instead, coalesced by
// the flag so only one reconcile is ever pending.
function scheduleReconcile() {
  if (state.reconcileScheduled) return;
  state.reconcileScheduled = true;
  defer(() => {
    state.reconcileScheduled = false;
    reconcile();
  });
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
  state.started = false;
  state.reconcileScheduled = false;
  state.stopWatching?.();
  state.stopWatching = null;
  unmount();
}

features.hero = { start, stop };

start();
