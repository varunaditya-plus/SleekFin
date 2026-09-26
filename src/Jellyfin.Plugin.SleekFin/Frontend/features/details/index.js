import { dom } from '../../shared/runtime.js';
import { createActions } from './actions.js';
import { createEpisodes } from './episodes.jsx';
import { createHero } from './hero.jsx';
import { createSections } from './sections.jsx';
import { createSimilar } from './similar.jsx';
import { createTrackPickers } from './trackPickers.js';

const CONCEALED_CLASS = 'sleekfin-details-concealed';
const CONCEAL_EVENT = 'sleekfin:details-conceal';
const DETAIL_PATH = /(^|\/)details\/?$/;
const HISTORY_METHODS = ['pushState', 'replaceState'];
const SUPPORTED_TYPES = ['Movie', 'Series', 'Season', 'Episode'];
// Jellyfin activates a page through viewManager.onViewChange, which dispatches these on the page
// element it just made current, so event.target identifies the page Jellyfin is showing.
const VIEW_EVENTS = ['viewinit', 'viewbeforeshow', 'viewshow'];
const WINDOW_EVENTS = ['hashchange', 'popstate', 'pageshow'];
const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});

features.details?.stop?.();

const state = {
  activePage: null,
  currentId: '',
  currentServerId: '',
  generation: 0,
  item: null,
  loadingId: '',
  mount: null,
  page: null,
  previousPage: null,
  reconcileTimer: 0,
  retryTimer: 0,
  seasons: [],
  started: false,
  stopHidden: null,
  stopHistory: null,
  stopWatching: null,
};

// Jellyfin 12 is a hash router, so the route is carried in window.location.hash; the pathname
// fallback mirrors the theme feature and the stripped '!' covers the deprecated bang form. Only the
// fallback needs location.search tacked on, and some routes start their query with '&'.
function route() {
  const target = (window.location.hash.slice(1) || `${window.location.pathname}${window.location.search}`)
    .replace(/^!+/, '');
  const separator = target.search(/[?&]/);
  const path = (separator < 0 ? target : target.slice(0, separator)).replace(/^[!/]+/, '/');
  if (!DETAIL_PATH.test(path)) return { id: '', serverId: '' };
  const parameters = new URLSearchParams(separator < 0 ? '' : target.slice(separator + 1));
  return { id: parameters.get('id') || '', serverId: parameters.get('serverId') || '' };
}

function conceal(concealed) {
  document.documentElement.classList.toggle(CONCEALED_CLASS, concealed);
  if (concealed) document.dispatchEvent(new Event(CONCEAL_EVENT));
}

function detailPageOf(target) {
  return target && typeof target.closest === 'function' ? target.closest('#itemDetailPage') : null;
}

function activePage() {
  if (!state.activePage) return null;
  if (dom.isConnected(state.activePage)) return state.activePage;
  state.activePage = null;
  return null;
}

// Jellyfin renders a page's own artwork as a background-image URL containing /Items/<id>/, which is
// what tells two containers with live content apart while they are on screen together.
function referencesId(page, id) {
  const marker = `/Items/${id}/`;
  return Array.from(page.querySelectorAll('[style*="/Items/"]'))
    .some((element) => (element.style.backgroundImage || '').includes(marker));
}

// A candidate is worth mounting on sight only when it is corroborated: it carries the marker our own
// mount set, or its own artwork belongs to the requested item.
function corroborated(page, id) {
  return page.dataset.sleekfinDetails === 'true' || referencesId(page, id);
}

// Jellyfin activates a page through viewManager.onViewChange, which sets currentView and then
// dispatches viewinit/viewbeforeshow/viewshow on that element, so event.target is the active page.
// Computed visibility cannot identify it: concealment sets visibility: hidden on every
// #itemDetailPage, and the positional fallback that replaced it mounted onto a stale container,
// released the concealment and painted the stock page. Without an active element only pages Jellyfin
// has not hidden are candidates, and one of them has to be identifiable beyond doubt before anything
// is mounted; otherwise the route waits for the next view event. That stays unambiguous only because
// reconcile() runs 80 ms after the navigation, by which point Jellyfin's afterAnimate has hidden the
// outgoing page: if two containers ever lack 'hide' at that moment, the marker and artwork
// preferences decide or the route waits - it never falls back to document order, which is what
// picked a stale container.
function findPage(id) {
  if (!id) return null;
  const active = activePage();
  if (active) return active;

  const candidates = Array.from(document.querySelectorAll('#itemDetailPage'))
    .filter((page) => !page.classList.contains('hide'))
    // The page the route is leaving stays on screen until Jellyfin swaps containers, and before the
    // incoming one is appended it is the only hide-less candidate. Mounting this item's hero there
    // would put it on the wrong page, so that page counts only when its own artwork already belongs
    // to the requested item.
    .filter((page) => page !== state.previousPage || referencesId(page, id));

  if (candidates.length === 1) {
    // A lone candidate is normally the page Jellyfin is showing, but one with no layout boxes cannot
    // paint at all, so it is mounted only when it is corroborated. This layout test decides whether a
    // candidate is worth mounting; pageHidden() must not consult layout, because a page Jellyfin is
    // midway through hiding still has its boxes and would then be reported as hidden.
    const only = candidates[0];
    return only.getClientRects().length > 0 || corroborated(only, id) ? only : null;
  }
  if (candidates.length > 1) {
    const mounted = candidates.filter((page) => page.dataset.sleekfinDetails === 'true');
    if (mounted.length === 1) return mounted[0];
    const matching = candidates.filter((page) => referencesId(page, id));
    if (matching.length === 1) return matching[0];
  }

  return null;
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
  stopHiddenWatch();
  if (!state.mount) return;
  state.mount.trackPickers.destroy();
  state.mount.episodes?.destroy();
  state.mount.similar.destroy();
  state.mount.sections.destroy();
  state.mount.actions.destroy();
  state.mount.hero.destroy();
  state.mount.page.classList.remove('sleekfin-details-entering');
  state.mount.page.removeAttribute('data-sleekfin-details');
  state.mount = null;
  document.documentElement.classList.remove('sleekfin-details-mounted');
}

function mount() {
  if (!state.page || !state.item || !SUPPORTED_TYPES.includes(state.item.Type)) return;
  const hero = createHero(state.page);
  if (!hero) {
    // Jellyfin's template does not expose the nodes the hero is built from, so keep its page and wait
    // for the outgoing detail page to hide before revealing it.
    revealNativePage();
    return;
  }
  const actions = createActions(hero.actions, state.item.Type === 'Episode');
  const sections = createSections(state.page);
  const similar = createSimilar(state.page);
  const trackPickers = createTrackPickers(state.page);
  const episodes = ['Series', 'Season', 'Episode'].includes(state.item.Type) && state.seasons.length ? createEpisodes(state.page, state.item, state.seasons) : null;

  state.mount = {
    actions,
    episodes,
    hero,
    page: state.page,
    sections,
    similar,
    trackPickers,
  };
  state.page.dataset.sleekfinDetails = 'true';
  document.documentElement.classList.add('sleekfin-details-mounted');
  hero.render(state.item, state.seasons);
  actions.reconcile();
  similar.render();
  // Revealed once Jellyfin has hidden the page it is leaving, which the observer below waits for.
  concealUntilAlone(state.page);
}

function load(id, serverId) {
  const client = routeClient(serverId);
  if (!client) {
    if (!window.ApiClient) {
      // The client has not been assigned yet, so the route keeps waiting for it.
      window.clearTimeout(state.retryTimer);
      state.retryTimer = window.setTimeout(scheduleReconcile, 250);
    } else {
      // The route belongs to another server than this client serves, so no item can ever resolve:
      // Jellyfin's own page has to show after the outgoing detail page is hidden.
      revealNativePage();
    }
    return;
  }

  const generation = state.generation;
  const userId = client.getCurrentUserId();
  const isCurrent = () => generation === state.generation && id === state.currentId;
  state.loadingId = id;

  client.getItem(userId, id)
    .then((mediaItem) => {
      if (!isCurrent()) return;
      state.item = mediaItem;
      state.loadingId = '';
      scheduleReconcile();
      if (!SUPPORTED_TYPES.includes(mediaItem.Type)) return;

      // Seasons only extend the view that is already on screen, so a failed season request must
      // not be handled like a failed item request.
      loadSeasons(client, userId, mediaItem)
        .then((result) => {
          if (!isCurrent()) return;
          state.seasons = result.Items || [];
          if (state.mount) {
            state.mount.hero.render(state.item, state.seasons);
            if (!state.mount.episodes && ['Series', 'Season', 'Episode'].includes(state.item.Type) && state.seasons.length) {
              state.mount.episodes = createEpisodes(state.page, state.item, state.seasons);
            }
          }
          scheduleReconcile();
        })
        .catch(() => {});
    })
    .catch(() => {
      if (!isCurrent()) return;
      state.loadingId = '';
      // Only an item that cannot be resolved falls back to Jellyfin's own page, otherwise the
      // concealment would leave the route dark until the boot failsafe expires.
      revealNativePage();
    });
}

function select(page, id, serverId) {
  const previousPage = state.mount?.page || state.page || state.previousPage;
  // Concealed before anything else so an in-app navigation hides the incoming native page in the
  // same task as the route change, before Jellyfin appends and paints it.
  conceal(true);
  destroyMount();
  state.generation += 1;
  state.currentId = id;
  state.currentServerId = serverId;
  state.item = null;
  state.loadingId = '';
  state.page = page;
  // The page recorded for the previous route must not be mounted onto this one.
  state.previousPage = previousPage;
  state.activePage = null;
  state.seasons = [];
  load(id, serverId);
}

function clearState() {
  destroyMount();
  state.generation += 1;
  state.currentId = '';
  state.currentServerId = '';
  state.item = null;
  state.loadingId = '';
  state.page = null;
  state.previousPage = null;
  state.activePage = null;
  state.seasons = [];
}

function reset() {
  clearState();
  conceal(false);
}

// Jellyfin hides the outgoing page only in its afterAnimate step, so releasing the concealment while
// another detail page is still shown exposes the native page: on detail-to-detail navigation as much
// as when leaving a detail route. Jellyfin's stylesheet defines `.hide { display: none !important }`,
// which makes that class the authoritative signal, and the observer below fires on the mutation that
// adds it. A layout test cannot stand in for it: a page Jellyfin is still hiding keeps its layout
// boxes, so treating "no boxes" as hidden released the concealment early and painted the stock page
// for a few frames on the way back to a non-detail route.
function pageHidden(page) {
  if (!dom.isConnected(page)) return true;
  for (let node = page; node && node !== document.body; node = node.parentElement) {
    if (node.classList.contains('hide')) return true;
  }
  return false;
}

function shownDetailPages(except) {
  return Array.from(document.querySelectorAll('#itemDetailPage'))
    .filter((page) => page !== except && !pageHidden(page));
}

function stopHiddenWatch() {
  state.stopHidden?.();
  state.stopHidden = null;
}

function observeDetailPages(callback) {
  const observer = new MutationObserver(callback);
  const observeChain = (start) => {
    for (let node = start; node && node !== document.body; node = node.parentElement) {
      observer.observe(node, { attributes: true, attributeFilter: ['class', 'style'], childList: true });
    }
  };
  Array.from(document.querySelectorAll('#itemDetailPage')).forEach(observeChain);
  if (document.body) observer.observe(document.body, { childList: true });
  state.stopHidden = () => observer.disconnect();
  callback();
}

function concealUntilAlone(except) {
  stopHiddenWatch();
  const release = () => {
    if (shownDetailPages(except).length) return;
    stopHiddenWatch();
    if (state.mount?.page === except) {
      except.classList.add('sleekfin-details-entering');
      const finish = (event) => {
        if (event.target !== except || event.animationName !== 'sleekfin-details-enter') return;
        except.removeEventListener('animationend', finish);
        except.classList.remove('sleekfin-details-entering');
      };
      except.addEventListener('animationend', finish);
    }
    conceal(false);
  };
  observeDetailPages(release);
}

function concealUntilPageHidden(page) {
  stopHiddenWatch();
  const release = () => {
    if (!pageHidden(page)) return;
    stopHiddenWatch();
    conceal(false);
  };
  observeDetailPages(release);
}

function revealNativePage() {
  concealUntilPageHidden(state.previousPage);
}

function leaveDetail() {
  // Re-concealed here because a mounted page was revealed: tearing the hero down would otherwise
  // put the stock layout back on screen while Jellyfin still shows that page during the transition.
  clearState();
  conceal(true);
  concealUntilAlone(null);
}

function reconcile() {
  if (!state.started) return;
  const currentRoute = route();
  const { id, serverId } = currentRoute;
  const page = findPage(id);
  if (!page) {
    // A null page means the active page is not identifiable yet, not that the route was left: the
    // concealment stays and the next reconcile decides. The real exits (non-detail route, failed
    // request, unsupported item, stop) release it.
    if (state.page || state.mount) {
      const previousPage = state.mount?.page || state.page || state.previousPage;
      conceal(true);
      destroyMount();
      state.previousPage = previousPage;
      state.page = null;
    }
    return;
  }
  if (state.currentId !== id || state.currentServerId !== serverId) {
    select(page, id, serverId);
    return;
  }
  if (state.page !== page) {
    const previousPage = state.mount?.page || state.page || state.previousPage;
    conceal(true);
    destroyMount();
    state.previousPage = previousPage;
    state.page = page;
  }
  if (!state.item) {
    if (!state.loadingId) {
      load(id, serverId);
    }
    return;
  }
  if (!SUPPORTED_TYPES.includes(state.item.Type)) {
    destroyMount();
    revealNativePage();
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
  state.mount.trackPickers.reconcile();
}

function scheduleReconcile() {
  window.clearTimeout(state.reconcileTimer);
  state.reconcileTimer = window.setTimeout(reconcile, 80);
}

function enter() {
  // Only a running instance acts on a navigation: a wrapper Jellyfin or another plugin installs over
  // the history methods keeps this one in the chain after stop() declined to remove it.
  if (!state.started) return;

  const { id, serverId } = route();
  if (!id) {
    if (state.currentId || state.page) {
      leaveDetail();
    } else {
      conceal(false);
    }
    return;
  }
  if (state.currentId === id && state.currentServerId === serverId) return;

  select(null, id, serverId);
}

function onRouteChange(event) {
  const page = detailPageOf(event?.target);
  if (page) {
    state.activePage = page;
  }
  enter();
  scheduleReconcile();
}

// Jellyfin 12 navigates through the history package, which calls window.history.pushState, so
// patching the history methods is what catches an in-app navigation early enough to conceal the
// native page Jellyfin is about to append. The window events and the page observer stay as the
// backup for navigations this wrapper cannot see.
function watchHistory() {
  const restores = HISTORY_METHODS.map((method) => {
    const original = window.history[method];
    const wrapper = function (...args) {
      const result = original.apply(this, args);
      onRouteChange();
      return result;
    };
    window.history[method] = wrapper;
    // Restored only while this wrapper is still the installed method: Jellyfin or another plugin
    // may have wrapped it after us, and assigning the original back would drop their wrapper.
    return () => {
      if (window.history[method] === wrapper) {
        window.history[method] = original;
      }
    };
  });
  return () => restores.forEach((restore) => restore());
}

// Back and forward never call the history methods, so the window popstate listener in WINDOW_EVENTS
// is their concealment point. Measured in a browser: popstate is fired at the Window object and does
// not reach document listeners at all, and on a target the capture and bubble listeners run in
// registration order, so an extra capture listener buys no ordering. React Router's own popstate
// handler only schedules an asynchronous render and the restored page is revealed in an effect,
// while this listener runs inside the popstate task.
function start() {
  if (state.started) return;

  state.started = true;
  state.stopWatching = dom.watchSpa(onRouteChange, {
    events: [...WINDOW_EVENTS, ...VIEW_EVENTS],
    viewshow: true,
  });
  state.stopHistory = watchHistory();
  onRouteChange();
}

function stop() {
  if (!state.started) return;

  state.started = false;
  window.clearTimeout(state.reconcileTimer);
  window.clearTimeout(state.retryTimer);
  state.stopWatching?.();
  state.stopWatching = null;
  state.stopHistory?.();
  state.stopHistory = null;
  reset();
}

features.details = { start, stop };
start();
