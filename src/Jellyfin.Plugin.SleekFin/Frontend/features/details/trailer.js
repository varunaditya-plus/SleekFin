import { dom } from '../../shared/runtime.js';

const START_DELAY_MS = 2500;
const START_TIMEOUT_MS = 7000;
const VIDEO_MIME_TYPES = Object.freeze({
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  ogg: 'video/ogg',
  ogv: 'video/ogg',
  webm: 'video/webm',
});

function mediaSourceFor(trailer) {
  const video = document.createElement('video');
  const sources = Array.isArray(trailer.MediaSources) ? trailer.MediaSources : [];
  for (const source of sources) {
    const container = String(source.Container || trailer.Container || '').toLowerCase().replace(/^\./, '');
    const mimeType = VIDEO_MIME_TYPES[container];
    if (!source.Id || !mimeType || !video.canPlayType || !video.canPlayType(mimeType)) continue;
    const hasDirectFlags = Object.prototype.hasOwnProperty.call(source, 'SupportsDirectPlay') || Object.prototype.hasOwnProperty.call(source, 'SupportsDirectStream');
    if (hasDirectFlags && !source.SupportsDirectPlay && !source.SupportsDirectStream) continue;
    return { source, container };
  }

  const container = String(trailer.Container || '').toLowerCase().replace(/^\./, '');
  const mimeType = VIDEO_MIME_TYPES[container];
  if (!mimeType || !video.canPlayType || !video.canPlayType(mimeType)) return null;
  return { source: null, container };
}

function localTrailerUrl(client, trailer) {
  if (!trailer?.Id || !client || typeof client.getUrl !== 'function') return '';
  const selected = mediaSourceFor(trailer);
  if (!selected) return '';

  const options = { Static: true };
  if (selected.source?.Id) options.mediaSourceId = selected.source.Id;
  if (selected.source?.ETag) options.Tag = selected.source.ETag;
  if (selected.source?.LiveStreamId) options.LiveStreamId = selected.source.LiveStreamId;
  if (typeof client.deviceId === 'function') options.deviceId = client.deviceId();
  if (typeof client.accessToken === 'function') options.ApiKey = client.accessToken();
  return client.getUrl(`Videos/${encodeURIComponent(trailer.Id)}/stream.${selected.container}`, options);
}

function stopVideo(video) {
  if (!video) return;
  video.pause();
  video.removeAttribute('src');
  try {
    video.load();
  } catch {
    // Some engines reject load() while Jellyfin is detaching the page.
  }
}

export function createTrailerPreview(page, nativeBackdrop, actions) {
  let currentItem = null;
  let enabled = false;
  let terminal = false;
  let generation = 0;
  let startTimer = 0;
  let attemptTimer = 0;
  let layer = null;
  let video = null;

  function isCurrent(token) {
    return token === generation && enabled && !terminal;
  }

  function pageCanPlayPreview() {
    return document.visibilityState !== 'hidden'
      && !document.documentElement.classList.contains('sleekfin-details-concealed')
      && dom.isVisible(page);
  }

  function removeLayer() {
    stopVideo(video);
    video = null;
    if (layer) {
      layer.remove();
      layer = null;
    }
  }

  function clearAttempt() {
    generation += 1;
    window.clearTimeout(startTimer);
    window.clearTimeout(attemptTimer);
    startTimer = 0;
    attemptTimer = 0;
    removeLayer();
    return generation;
  }

  function finish(token) {
    if (token !== generation) return;
    terminal = true;
    clearAttempt();
  }

  function markPlaying(token) {
    if (!isCurrent(token)) return;
    if (!pageCanPlayPreview()) {
      finish(token);
      return;
    }
    window.clearTimeout(attemptTimer);
    attemptTimer = 0;
    layer?.setAttribute('data-playing', 'true');
  }

  function playLocal(url, token) {
    const element = document.createElement('video');
    video = element;
    element.autoplay = true;
    element.controls = false;
    element.defaultMuted = true;
    element.muted = true;
    element.playsInline = true;
    element.preload = 'metadata';
    element.setAttribute('muted', '');
    element.setAttribute('playsinline', '');
    element.setAttribute('webkit-playsinline', '');
    element.addEventListener('playing', () => markPlaying(token));
    element.addEventListener('ended', () => finish(token));
    element.addEventListener('error', () => finish(token));
    layer = document.createElement('div');
    layer.className = 'sleekfin-details-trailer';
    layer.setAttribute('data-playing', 'false');
    nativeBackdrop.appendChild(layer);
    layer.appendChild(element);
    element.src = url;
    try {
      const result = element.play();
      if (result && typeof result.catch === 'function') {
        result.catch(() => {
          if (isCurrent(token) && layer?.getAttribute('data-playing') !== 'true') finish(token);
        });
      }
    } catch {
      finish(token);
    }
  }

  function startAttempt(token) {
    if (!isCurrent(token)) return;
    if (!pageCanPlayPreview()) {
      startTimer = window.setTimeout(() => startAttempt(token), 250);
      return;
    }

    const item = currentItem;
    const client = window.ApiClient;
    if (!item || !client) {
      finish(token);
      return;
    }

    const itemServerId = String(item.ServerId || '').toLowerCase();
    if (itemServerId && typeof client.serverId === 'function' && String(client.serverId()).toLowerCase() !== itemServerId) {
      finish(token);
      return;
    }

    attemptTimer = window.setTimeout(() => finish(token), START_TIMEOUT_MS);
    if (!(Number(item.LocalTrailerCount) > 0) || typeof client.getLocalTrailers !== 'function') {
      finish(token);
      return;
    }

    Promise.resolve()
      .then(() => client.getLocalTrailers(client.getCurrentUserId(), item.Id))
      .then((trailers) => {
        if (!isCurrent(token)) return;
        const url = (Array.isArray(trailers) ? trailers : []).map((trailer) => localTrailerUrl(client, trailer)).find(Boolean);
        if (url) playLocal(url, token);
        else finish(token);
      })
      .catch(() => finish(token));
  }

  function schedule() {
    if (terminal || !enabled || !currentItem) return;
    const token = clearAttempt();
    terminal = false;
    startTimer = window.setTimeout(() => startAttempt(token), START_DELAY_MS);
  }

  function update(item, nextEnabled) {
    const itemChanged = currentItem?.Id !== item?.Id || currentItem?.ServerId !== item?.ServerId;
    const wasEnabled = enabled;
    if (itemChanged) {
      clearAttempt();
      terminal = false;
      currentItem = item;
    }

    enabled = nextEnabled === true;
    if (!enabled) {
      if (wasEnabled || startTimer || attemptTimer || layer) clearAttempt();
      terminal = false;
      return;
    }

    if (!wasEnabled || itemChanged) schedule();
  }

  function onActionClick(event) {
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const actionElement = target?.closest('.btnPlay, .btnReplay, .btnPlayTrailer, [data-action]');
    if (!actionElement || !actions.contains(actionElement)) return;
    const action = String(actionElement.dataset.action || '').toLowerCase();
    if (actionElement.matches('.btnPlay, .btnReplay, .btnPlayTrailer') || ['play', 'resume', 'playtrailer', 'play-trailer', 'trailer'].includes(action)) {
      finish(generation);
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && enabled && !terminal) finish(generation);
  }

  page.addEventListener('click', onActionClick, true);
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    destroy() {
      enabled = false;
      terminal = true;
      clearAttempt();
      page.removeEventListener('click', onActionClick, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      currentItem = null;
    },
    update,
  };
}
