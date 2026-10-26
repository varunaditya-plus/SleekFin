import { dom } from '../../shared/runtime.js';
import { createYoutubePreview, youtubeId } from './youtube.js';

const START_TIMEOUT_MS = 12000;

function previewProfile() {
  const video = document.createElement('video');
  const formats = [
    { Container: 'mp4,m4v', VideoCodec: 'h264', AudioCodec: 'aac', mime: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"' },
    { Container: 'webm', VideoCodec: 'vp8', AudioCodec: 'vorbis', mime: 'video/webm; codecs="vp8, vorbis"' },
    { Container: 'webm', VideoCodec: 'vp9', AudioCodec: 'opus', mime: 'video/webm; codecs="vp9, opus"' },
  ].filter((format) => video.canPlayType(format.mime));
  return {
    MaxStreamingBitrate: 8000000,
    DirectPlayProfiles: formats.map(({ Container, VideoCodec, AudioCodec }) => ({ Type: 'Video', Container, VideoCodec, AudioCodec })),
    TranscodingProfiles: formats.slice(0, 1).map(({ Container, VideoCodec, AudioCodec }) => ({ Type: 'Video', Container: Container.split(',')[0], VideoCodec, AudioCodec, Protocol: 'http', Context: 'Streaming', MaxAudioChannels: '2' })),
    CodecProfiles: [{ Type: 'Video', Conditions: [{ Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8', IsRequired: false }] }],
  };
}

async function trailerSource(client, trailer, forceTranscode) {
  const sourceId = trailer.MediaSources?.[0]?.Id;
  const result = await client.ajax({
    type: 'POST',
    url: client.getUrl(`Items/${encodeURIComponent(trailer.Id)}/PlaybackInfo`),
    contentType: 'application/json',
    dataType: 'json',
    data: JSON.stringify({ UserId: client.getCurrentUserId(), MediaSourceId: sourceId, SubtitleStreamIndex: -1, DeviceProfile: previewProfile(), EnableDirectPlay: !forceTranscode, EnableDirectStream: false, EnableTranscoding: true, AutoOpenLiveStream: false }),
  });
  if (result.ErrorCode) return null;
  for (const source of result.MediaSources || []) {
    if (source.RequiresOpening) continue;
    if (source.SupportsDirectPlay && source.Id && source.Container) {
      const options = { Static: true, mediaSourceId: source.Id, deviceId: client.deviceId(), ApiKey: client.accessToken() };
      if (source.ETag) options.Tag = source.ETag;
      return { url: client.getUrl(`Videos/${encodeURIComponent(trailer.Id)}/stream.${encodeURIComponent(source.Container)}`, options) };
    }
    if (source.SupportsTranscoding && source.TranscodingUrl && result.PlaySessionId) {
      return { url: client.getUrl(source.TranscodingUrl), client, playSessionId: result.PlaySessionId };
    }
  }
  return null;
}

function remoteUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function createTrailerPreview(page, nativeBackdrop, actions) {
  let currentItem = null;
  let enabled = false;
  let generation = 0;
  let startTimer = 0;
  let attemptTimer = 0;
  let video = null;
  let candidates = [];
  let encoding = null;
  let youtube = null;
  let settings = null;

  function isCurrent(token) {
    return token === generation && enabled;
  }

  function pageCanPlayPreview() {
    return document.visibilityState !== 'hidden'
      && !document.documentElement.classList.contains('sleekfin-details-concealed')
      && !Array.from(document.querySelectorAll('audio, video')).some((media) => media !== video && !media.paused && !media.ended)
      && dom.isVisible(page);
  }

  function removeLayer() {
    window.removeEventListener('resize', sizeYoutube);
    youtube?.destroy();
    youtube = null;
    if (video?.tagName === 'VIDEO') {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    video?.remove();
    video = null;
    if (encoding) {
      const { client, playSessionId } = encoding;
      encoding = null;
      // Never stop a foreground transcode that belongs to the same device.
      client.ajax({ type: 'DELETE', url: client.getUrl('Videos/ActiveEncodings', { deviceId: client.deviceId(), playSessionId }) }).catch(() => console.warn('[SleekFin] Trailer encoding cleanup failed.'));
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
    candidates = [];
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
    video.dataset.playing = 'true';
  }

  function playVideo(url, token) {
    const element = document.createElement('video');
    video = element;
    element.className = 'sleekfin-details-trailer';
    element.autoplay = true;
    element.defaultMuted = settings.trailerAudio !== 'Sound';
    element.muted = element.defaultMuted;
    element.volume = 1;
    element.loop = settings.trailerEndBehavior === 'Loop';
    element.preload = 'metadata';
    element.setAttribute('playsinline', '');
    element.addEventListener('playing', () => markPlaying(token));
    element.addEventListener('ended', () => finish(token));
    element.addEventListener('error', () => nextCandidate(token));
    nativeBackdrop.appendChild(element);
    element.src = url;
    const failed = (error) => {
      if (!isCurrent(token) || element.dataset.playing === 'true') return;
      // Browsers can reject sound autoplay even when the administrator enabled it.
      if (!element.muted && error?.name === 'NotAllowedError') {
        element.muted = true;
        element.play()?.catch(() => nextCandidate(token));
      } else nextCandidate(token);
    };
    try { element.play()?.catch(failed); } catch (error) { failed(error); }
  }

  function playYoutube(id, token) {
    const iframe = document.createElement('iframe');
    video = iframe;
    iframe.className = 'sleekfin-details-trailer';
    iframe.allow = 'autoplay';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.src = `https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=0&controls=0&fs=0&playsinline=1&rel=0&origin=${encodeURIComponent(window.location.origin)}`;
    nativeBackdrop.appendChild(iframe);
    sizeYoutube();
    window.addEventListener('resize', sizeYoutube);
    youtube = createYoutubePreview(iframe, { muted: settings.trailerAudio !== 'Sound', loop: settings.trailerEndBehavior === 'Loop', onPlaying: () => markPlaying(token), onEnded: () => finish(token), onError: () => nextCandidate(token) });
  }

  function sizeYoutube() {
    if (video?.tagName !== 'IFRAME') return;
    const bounds = nativeBackdrop.getBoundingClientRect();
    const fit = settings.backdropFit === 'Contain' ? Math.min : Math.max;
    const width = Math.ceil(fit(bounds.width, bounds.height * 16 / 9));
    video.style.width = `${width}px`;
    video.style.height = `${width * 9 / 16}px`;
    video.style.left = `${(bounds.width - width) * settings.backdropFocusX / 100}px`;
    video.style.top = `${(bounds.height - width * 9 / 16) * settings.backdropFocusY / 100}px`;
  }

  function nextCandidate(token) {
    if (!isCurrent(token)) return;
    const nextToken = clearAttempt();
    const candidate = candidates.shift();
    if (!candidate || !pageCanPlayPreview()) {
      finish(nextToken);
      return;
    }
    attemptTimer = window.setTimeout(() => nextCandidate(nextToken), START_TIMEOUT_MS);
    if (candidate.url) {
      const id = youtubeId(candidate.url);
      if (id) playYoutube(id, nextToken);
      else playVideo(candidate.url, nextToken);
      return;
    }
    trailerSource(candidate.client, candidate.item, candidate.forceTranscode).then((source) => {
      if (!isCurrent(nextToken)) return;
      if (!source) {
        nextCandidate(nextToken);
        return;
      }
      if (!source.playSessionId && !candidate.forceTranscode) candidates.unshift({ ...candidate, forceTranscode: true });
      encoding = source.playSessionId ? source : null;
      playVideo(source.url, nextToken);
    }).catch(() => nextCandidate(nextToken));
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

    Promise.resolve()
      .then(() => Number(item.LocalTrailerCount) > 0 ? client.getLocalTrailers(client.getCurrentUserId(), item.Id) : [])
      .then((trailers) => {
        if (!isCurrent(token)) return;
        candidates = (Array.isArray(trailers) ? trailers : []).filter((trailer) => trailer?.Id).map((trailer) => ({ client, item: trailer })).concat(candidates);
        nextCandidate(token);
      })
      .catch(() => nextCandidate(token));
  }

  function schedule() {
    if (!enabled || !currentItem) return;
    const token = clearAttempt();
    candidates = (currentItem.RemoteTrailers || []).map((trailer) => ({ url: remoteUrl(trailer.Url) })).filter((candidate) => candidate.url);
    if (!(Number(currentItem.LocalTrailerCount) > 0) && !candidates.length) return;
    const delay = settings.trailerStartDelaySeconds * 1000;
    attemptTimer = window.setTimeout(() => nextCandidate(token), delay + START_TIMEOUT_MS);
    startTimer = window.setTimeout(() => startAttempt(token), delay);
  }

  function update(item, nextSettings) {
    const itemChanged = currentItem?.Id !== item?.Id || currentItem?.ServerId !== item?.ServerId;
    const wasEnabled = enabled;
    const playbackChanged = settings && ['trailerStartDelaySeconds', 'trailerAudio', 'trailerEndBehavior'].some((key) => settings[key] !== nextSettings[key]);
    settings = nextSettings;
    if (itemChanged) {
      clearAttempt();
      currentItem = item;
    }

    enabled = settings.trailerBackgroundEnabled === true;
    if (!enabled) {
      if (wasEnabled || startTimer || attemptTimer || video) clearAttempt();
      return;
    }

    if (!wasEnabled || itemChanged || playbackChanged) schedule();
    else sizeYoutube();
  }

  function onActionClick(event) {
    const action = event.target.closest('.btnPlay, .btnReplay, .btnPlayTrailer');
    if (action && actions.contains(action)) finish(generation);
  }

  function onMediaPlay(event) {
    if (event.target !== video && enabled) finish(generation);
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'hidden' && enabled) finish(generation);
  }

  function togglePlayback() {
    if (!settings.backdropPauseEnabled || video?.dataset.playing !== 'true') return;
    if (video.tagName === 'IFRAME') youtube?.togglePlayback();
    else if (video.paused) {
      video.muted = settings.trailerAudio !== 'Sound';
      video.play()?.catch(() => {});
    }
    else video.pause();
  }

  page.addEventListener('click', onActionClick, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  document.addEventListener('play', onMediaPlay, true);

  return {
    destroy() {
      enabled = false;
      clearAttempt();
      page.removeEventListener('click', onActionClick, true);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('play', onMediaPlay, true);
      currentItem = null;
    },
    togglePlayback,
    update,
  };
}
