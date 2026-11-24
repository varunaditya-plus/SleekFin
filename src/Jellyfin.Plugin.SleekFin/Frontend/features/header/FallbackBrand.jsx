import { Fragment, dom, h, render } from '../../shared/runtime.js';
import { mark } from './shared.js';

function FallbackBrand({ imageSource, serverName }) {
  return (
    <>
      {imageSource ? <img src={imageSource} /> : null}
      <span>{serverName}</span>
    </>
  );
}

export function createBrandController(isActive) {
  const state = {
    fallback: null,
    serverName: '',
    serverNameRequest: 0,
    serverNameRequested: false,
  };

  function readServerName(nativeBrand) {
    const nativeText = nativeBrand?.textContent.trim();
    if (nativeText) {
      state.serverName = nativeText;
    }
    if (!state.serverName) {
      state.serverName = (document.title || 'Jellyfin').replace(/\s+[|·-]\s+Jellyfin$/i, '').trim() || 'Jellyfin';
    }
    return state.serverName;
  }

  function findImageSource() {
    const nativeImage = document.querySelector('a[href="#/"] img');
    if (nativeImage) return nativeImage.currentSrc || nativeImage.src;

    const icons = Array.from(document.querySelectorAll('link[rel~="icon"]'));
    const preferredIcon = icons.find((icon) => /icon-transparent|apple-touch|192|512/i.test(icon.getAttribute('href') || '')) || icons[icons.length - 1];
    return preferredIcon ? preferredIcon.href : '';
  }

  function renderFallback() {
    if (!dom.isConnected(state.fallback)) return;

    render(<FallbackBrand imageSource={findImageSource()} serverName={readServerName(null)} />, state.fallback);
  }

  function requestServerName() {
    if (state.serverNameRequested || typeof window.fetch !== 'function') return;

    const systemInfoUrl = window.ApiClient && typeof window.ApiClient.getUrl === 'function' ? window.ApiClient.getUrl('/System/Info/Public') : new URL('../System/Info/Public', document.baseURI).toString();
    const request = ++state.serverNameRequest;
    state.serverNameRequested = true;
    window
      .fetch(systemInfoUrl, { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((systemInfo) => {
        if (!isActive() || request !== state.serverNameRequest) return;

        const serverName = typeof systemInfo?.ServerName === 'string' ? systemInfo.ServerName.trim() : '';
        if (serverName) {
          state.serverName = serverName;
          renderFallback();
        }
      })
      .catch(() => {});
  }

  function resetServer() {
    state.serverName = '';
    state.serverNameRequest += 1;
    state.serverNameRequested = false;
    renderFallback();
  }

  function removeFallback() {
    if (!state.fallback) return;

    render(null, state.fallback);
    state.fallback.remove();
    state.fallback = null;
  }

  function ensureFallback(parent = document.body) {
    requestServerName();
    if (dom.isConnected(state.fallback)) return;

    removeFallback();
    const fallback = document.createElement('a');
    fallback.className = 'sleekfin-header-fallback-brand';
    fallback.setAttribute('data-sleekfin-header-identity', '');
    fallback.href = '#/';
    parent.appendChild(fallback);
    state.fallback = fallback;
    renderFallback();
  }

  function useNative(mount, nativeBrand) {
    readServerName(nativeBrand);
    mark(mount, nativeBrand, 'data-sleekfin-header-brand');
    mark(mount, nativeBrand, 'data-sleekfin-header-identity', '');
    removeFallback();
  }

  function updateOverlap(mount) {
    const element = mount.brand || state.fallback;
    if (!element) return;

    mark(mount, element, 'data-sleekfin-header-overlap-hidden', 'false');
    if (!mount.proxy || (window.innerWidth >= 1100 && mount.proxy.getAttribute('data-sleekfin-header-overflow-active') !== 'true' && !document.documentElement.classList.contains('sleekfin-details-mounted'))) return;

    const brandBounds = element.getBoundingClientRect();
    const barBounds = mount.proxy.getBoundingClientRect();
    const overlaps = brandBounds.width > 0 && barBounds.width > 0 && brandBounds.left < barBounds.right && brandBounds.right > barBounds.left && brandBounds.top < barBounds.bottom && brandBounds.bottom > barBounds.top;
    mark(mount, element, 'data-sleekfin-header-overlap-hidden', overlaps ? 'true' : 'false');
  }

  function updateOffset(mount) {
    mark(mount, mount.brand || state.fallback, 'data-sleekfin-header-menu-offset', dom.isVisible(mount.menu) ? 'true' : 'false');
  }

  return { ensureFallback, removeFallback, resetServer, updateOffset, updateOverlap, useNative };
}
