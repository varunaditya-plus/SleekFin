import { isVisible } from './dom.js';

function positive(value, fallback) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getPopupViewport() {
  // Jellyfin uses the same finite fallback for webOS clients reporting infinite viewport dimensions.
  const width = positive(window.innerWidth, positive(document.documentElement.clientWidth, 3840));
  const height = positive(window.innerHeight, positive(document.documentElement.clientHeight, 2160));
  const visual = window.visualViewport;
  const offsetLeft = visual && Number.isFinite(visual.offsetLeft) ? visual.offsetLeft : 0;
  const offsetTop = visual && Number.isFinite(visual.offsetTop) ? visual.offsetTop : 0;
  const left = Math.max(0, offsetLeft);
  const top = Math.max(0, offsetTop);
  const right = Math.min(width, offsetLeft + positive(visual?.width, width));
  const bottom = Math.min(height, offsetTop + positive(visual?.height, height));
  if (right <= left || bottom <= top) return { left: 0, top: 0, right: width, bottom: height, width, height };
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function popupFrame(layer, popup, trigger) {
  if (popup.parentElement !== layer || layer.hidden || popup.hidden || popup.getClientRects().length === 0 || !isVisible(layer)) return null;
  if (trigger.hidden || !isVisible(trigger)) return null;
  const viewport = getPopupViewport();
  const rect = layer.getBoundingClientRect();
  const scaleX = rect.width / layer.offsetWidth;
  const scaleY = rect.height / layer.offsetHeight;
  if (![rect.left, rect.top, rect.right, rect.bottom, scaleX, scaleY].every(Number.isFinite) || scaleX <= 0 || scaleY <= 0) return null;
  const left = Math.max(viewport.left, rect.left + layer.clientLeft * scaleX);
  const top = Math.max(viewport.top, rect.top + layer.clientTop * scaleY);
  const right = Math.min(viewport.right, rect.left + (layer.clientLeft + layer.clientWidth) * scaleX);
  const bottom = Math.min(viewport.bottom, rect.top + (layer.clientTop + layer.clientHeight) * scaleY);
  if (right <= left || bottom <= top) return null;
  const anchor = trigger.getBoundingClientRect();
  if (![anchor.left, anchor.top, anchor.right, anchor.bottom, anchor.width, anchor.height].every(Number.isFinite) || anchor.width <= 0 || anchor.height <= 0 || anchor.right <= left || anchor.left >= right || anchor.bottom <= top || anchor.top >= bottom) return null;
  return { rect, scaleX, scaleY, left, top, right, bottom, anchor };
}

export function positionPopup(layer, popup, trigger) {
  const frame = popupFrame(layer, popup, trigger);
  if (!frame) return false;
  const { rect, scaleX, scaleY, anchor } = frame;
  const leftEdge = frame.left + 12;
  const topEdge = frame.top + 12;
  const rightEdge = frame.right - 12;
  const bottomEdge = frame.bottom - 12;
  const widthLimit = (rightEdge - leftEdge) / scaleX;
  const heightLimit = (bottomEdge - topEdge) / scaleY;
  if (widthLimit <= 0 || heightLimit <= 0) return false;
  popup.style.minWidth = `${Math.min(widthLimit, anchor.width / scaleX)}px`;
  popup.style.maxWidth = `${widthLimit}px`;
  popup.style.maxHeight = `${heightLimit}px`;
  const size = popup.getBoundingClientRect();
  if (![size.width, size.height].every(Number.isFinite) || size.width <= 0 || size.height <= 0) return false;
  const rtl = window.getComputedStyle(trigger).direction === 'rtl';
  const alignedLeft = rtl ? anchor.right - size.width : anchor.left;
  let top = anchor.bottom + 8;
  if (top + size.height > bottomEdge && anchor.top - 8 - size.height >= topEdge) top = anchor.top - 8 - size.height;
  const left = Math.max(leftEdge, Math.min(alignedLeft, rightEdge - size.width));
  top = Math.max(topEdge, Math.min(top, bottomEdge - size.height));
  // Jellyfin's contained dialogs and animated pages establish their own fixed coordinate frames.
  popup.style.left = `${(left - rect.left) / scaleX - layer.clientLeft}px`;
  popup.style.top = `${(top - rect.top) / scaleY - layer.clientTop}px`;
  return true;
}

export function watchPopupPosition(layer, popup, trigger, onPosition, onClose) {
  const owner = trigger.parentElement;
  const parent = layer.parentElement;
  let frame = 0;
  let stopped = false;
  let previous = '';

  function stop() {
    stopped = true;
    window.cancelAnimationFrame(frame);
    frame = 0;
  }

  function update() {
    frame = 0;
    if (stopped) return;
    const geometry = popupFrame(layer, popup, trigger);
    if (!geometry || layer.parentElement !== parent || trigger.parentElement !== owner) {
      stop();
      onClose();
      return;
    }
    const { rect, anchor, left, top, right, bottom } = geometry;
    const signature = [rect.left, rect.top, rect.width, rect.height, layer.clientWidth, layer.clientHeight, anchor.left, anchor.top, anchor.width, anchor.height, left, top, right, bottom, popup.offsetWidth, popup.offsetHeight, popup.scrollWidth, popup.scrollHeight].join('|');
    if (signature !== previous) {
      previous = signature;
      const positioned = onPosition();
      if (stopped) return;
      if (positioned === false) {
        stop();
        onClose();
        return;
      }
    }
    if (!stopped) frame = window.requestAnimationFrame(update);
  }

  frame = window.requestAnimationFrame(update);
  return stop;
}
