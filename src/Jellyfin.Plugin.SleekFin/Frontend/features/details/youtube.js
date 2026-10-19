const API_URL = 'https://www.youtube.com/iframe_api';
const API_TIMEOUT_MS = 10000;
let apiPromise = null;

export function youtubeId(value) {
  if (typeof value !== 'string') return '';
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    const parts = url.pathname.split('/').filter(Boolean);
    let id = '';
    if (url.hostname === 'youtu.be' && parts.length === 1) {
      id = parts[0];
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'].includes(url.hostname)) {
      if (parts.length === 1 && parts[0] === 'watch') id = url.searchParams.get('v') || '';
      else if (parts.length === 2 && ['embed', 'shorts', 'live', 'v'].includes(parts[0])) id = parts[1];
    }
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  const promise = new Promise((resolve, reject) => {
    let script = document.querySelector(`script[src="${API_URL}"], script[src="https://www.youtube.com/player_api"]`);
    const owned = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = API_URL;
      script.async = true;
    }

    const deadline = Date.now() + API_TIMEOUT_MS;
    let timer = 0;
    let settled = false;
    function finish(error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      script.removeEventListener('error', onError);
      if (error) {
        if (owned) script.remove();
        reject(error);
      } else resolve(window.YT);
    }
    function onError() {
      finish(new Error('YouTube player could not load.'));
    }
    function poll() {
      if (window.YT?.Player) finish();
      else if (Date.now() >= deadline) onError();
      else timer = window.setTimeout(poll, 100);
    }

    // Jellyfin owns its API-ready callback; polling avoids replacing it.
    script.addEventListener('error', onError);
    if (owned) document.head.appendChild(script);
    poll();
  });
  apiPromise = promise;
  promise.catch(() => {
    if (apiPromise === promise) apiPromise = null;
  });
  return promise;
}

export function createYoutubePreview(iframe, { onPlaying, onEnded, onError }) {
  let cancelled = false;
  let player = null;
  loadYoutubeApi().then((api) => {
    if (cancelled || !iframe.isConnected) return;
    player = new api.Player(iframe, {
      events: {
        onReady(event) {
          if (cancelled) return;
          event.target.mute();
          event.target.setVolume(0);
          event.target.playVideo();
        },
        onStateChange(event) {
          if (cancelled) return;
          if (event.data === 1) {
            event.target.mute();
            onPlaying();
          } else if (event.data === 0) onEnded();
        },
        onError() {
          if (!cancelled) onError();
        },
        onAutoplayBlocked() {
          if (!cancelled) onError();
        },
      },
    });
  }).catch(() => {
    if (!cancelled) onError();
  });

  return {
    destroy() {
      cancelled = true;
      player?.destroy();
      player = null;
    },
    togglePlayback() {
      if (player.getPlayerState() === window.YT.PlayerState.PAUSED) player.playVideo();
      else player.pauseVideo();
    },
  };
}
