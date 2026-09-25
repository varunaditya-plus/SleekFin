const HOLD_FRAMES = 240;
const TRANSITION_MS = 300;
const MAX_ROUTES = 50;

function routeKey() {
  return window.location.hash || window.location.pathname || '/';
}

// Jellyfin 12 does not restore scroll itself. Its only related line is `isRestored || scrollTo(0, 0)`,
// and `isRestored` is never set on a back navigation, so restoration is left to the browser: that runs
// while the home and library pages are still filling in, lands on a position the half-built document
// can hold, and is never re-applied. The user is left near the top. The position is therefore recorded
// per route and re-applied here.
export function createScrollFeature() {
  let current = routeKey();
  let lastScrolled = '';
  let live = 0;
  let native = null;
  let pausedUntil = 0;
  let pending = 0;
  let positions = null;
  let restoring = false;
  let recordedRoute = '';
  let started = false;
  let installed = false;
  let stopNavigation = null;

  // Built on first use rather than at module evaluation: the theme bundle runs on every page, and Map
  // is not available on the oldest browsers the build targets.
  function store() {
    if (positions === null) positions = new Map();
    return positions;
  }

  function remember(key, value) {
    const routes = store();
    if (routes.get(key) === value) return;
    if (routes.size >= MAX_ROUTES) {
      positions = new Map(Array.from(routes).slice(1 - MAX_ROUTES));
    }
    store().set(key, value);
  }

  // The browser's own restoration competes with this one: it lands on a clamped value, and scroll
  // anchoring then reinterprets every later layout change against that wrong position. Restoration is
  // taken over while running and handed back afterwards, so a first visit to a route with nothing
  // recorded still starts at the top the way Jellyfin intends.
  function own(owned) {
    if (owned) {
      if (native !== null) return;
      native = history.scrollRestoration;
      history.scrollRestoration = 'manual';
      return;
    }
    restoring = false;
    if (native === null) return;
    history.scrollRestoration = native;
    native = null;
  }

  function onScroll() {
    // The reading pauses across a transition, because Jellyfin announces a navigation by moving the
    // page first: its own collapse of the outgoing page lands well before the route changes, and those
    // frames report that movement rather than the user. The pause is bounded by time, so a click that
    // navigates nowhere - a dialog, a filter chip - cannot leave the reading stale for the rest of the
    // route; the gesture listeners below end it early as well.
    if (restoring || performance.now() < pausedUntil) return;
    // A reading taken on this route after the transition replaces what was recorded for it, so a click
    // that navigates nowhere does not freeze the route at the position it happened to be at.
    recordedRoute = '';
    live = window.scrollY;
    lastScrolled = current;
  }

  // The recorded position is taken from a reading that belongs to the route being left, which is what
  // `lastScrolled` tracks, and a route keeps the first position recorded for it: the route events fire
  // again while the outgoing page is still collapsing, and letting them re-commit would replace the
  // user's place with a frame of that collapse. A route the user has not scrolled on has nothing to
  // record, and that is not a failure - it starts at the top, which is what Jellyfin intends for a page
  // being opened.
  function commit() {
    if (restoring || lastScrolled !== current || recordedRoute === current) return;
    recordedRoute = current;
    pausedUntil = performance.now() + TRANSITION_MS;
    remember(current, live);
  }

  // Scrolling by hand ends a restore, so a position is never held against the user. Keyboard scrolling
  // is included because the hold cannot tell it apart from the content rearranging, and arrow keys and
  // a TV remote move the page the same way a wheel does.
  function cancelRestore() {
    pausedUntil = 0;
    if (!restoring) return;
    pending = 0;
    own(false);
  }

  function watchNavigation() {
    // A restart cannot install a second wrapper: the first one is deliberately left in place when
    // another script wrapped over it, so without this each restart would add another layer that keeps
    // committing positions after the feature has been replaced.
    if (installed) return;
    installed = true;

    document.addEventListener('pointerdown', commit, true);
    document.addEventListener('keydown', cancelRestore, true);
    document.addEventListener('wheel', cancelRestore, { capture: true, passive: true });
    document.addEventListener('touchstart', cancelRestore, { capture: true, passive: true });

    // Jellyfin 12 navigates through its router, which calls history.pushState; a hash change is never
    // dispatched for an in-page navigation, so this is the signal that catches one as it starts.
    const pushState = window.history.pushState;
    const wrapper = function (...args) {
      commit();
      return pushState.apply(this, args);
    };
    window.history.pushState = wrapper;

    // Unwrapped only while this wrapper is still the installed method: Jellyfin or another plugin may
    // have wrapped it after us, and assigning the original back would drop their wrapper.
    stopNavigation = () => {
      document.removeEventListener('pointerdown', commit, true);
      document.removeEventListener('keydown', cancelRestore, true);
      document.removeEventListener('wheel', cancelRestore, true);
      document.removeEventListener('touchstart', cancelRestore, true);
      if (window.history.pushState === wrapper) {
        window.history.pushState = pushState;
      }
    };
  }

  function onRouteChange() {
    commit();
    pausedUntil = 0;
    lastScrolled = '';
    recordedRoute = '';
    current = routeKey();
    const target = positions === null ? 0 : positions.get(current) || 0;
    if (target > 0) {
      restore(target);
      return;
    }
    pending = 0;
    own(false);
  }

  function restore(target) {
    pending = target;
    restoring = true;
    own(true);
    window.requestAnimationFrame(() => apply(target, HOLD_FRAMES));
  }

  function finish(target) {
    if (pending !== target) return;
    pending = 0;
    own(false);
  }

  // The position is re-applied until it can be held, because the arriving document is usually too
  // short for it and a scroll the document cannot reach is silently ignored. It is then held for a
  // bounded number of frames - so its length in seconds depends on the refresh rate - rather than until
  // the page looks calm, because looking calm proves nothing here: the home page is briefly still
  // before the hero is inserted about a second in carrying a viewport-height block, and anchoring
  // answers that shift by dragging the view down. The frame budget is what ends the hold, and a hand
  // scroll ends it sooner.
  function apply(target, frames) {
    if (pending !== target) return;
    if (document.documentElement.scrollHeight - window.innerHeight >= target && window.scrollY !== target) {
      window.scrollTo(0, target);
    }
    if (frames <= 0) return finish(target);
    window.requestAnimationFrame(() => apply(target, frames - 1));
  }

  // Taken over before the browser applies its own restoration, which runs after this task. A back
  // traversal already arrives as the pageshow below, so this only matters for a client that reports one
  // without the other.
  function onPop() {
    if (positions !== null && (positions.get(routeKey()) || 0) > 0) onRouteChange();
  }

  function start() {
    if (started) return;

    started = true;
    current = routeKey();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onRouteChange);
    // The route signal that tracking depends on. Jellyfin's router dispatches this from its commit
    // phase for an in-page navigation, and neither hashchange nor popstate fires for one, so removing
    // it would leave `current` stale and file a position under the wrong route.
    window.addEventListener('pageshow', onRouteChange);
    watchNavigation();
  }

  function stop() {
    if (!started) return;

    started = false;
    pending = 0;
    own(false);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('popstate', onPop);
    window.removeEventListener('hashchange', onRouteChange);
    window.removeEventListener('pageshow', onRouteChange);
    stopNavigation?.();
    stopNavigation = null;
    installed = false;
    positions = null;
  }

  return { start, stop };
}
