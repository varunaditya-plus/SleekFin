import { isVisible } from './dom.js';

export function isTvBackspace() {
  const agent = navigator.userAgent.toLowerCase();
  return document.documentElement.classList.contains('layout-tv') && agent.includes('hisense') && agent.includes('vidaa');
}

export function createPopupDialog(layer, popup, trigger, onClose) {
  const helper = window.Dashboard?.dialogHelper;
  if (!document.documentElement.classList.contains('layout-tv') || !helper?.createDialog || !helper.open || !helper.close) return null;
  const href = window.location.href;
  const owner = trigger.closest('.dialog');
  const host = helper.createDialog({ enableHistory: false, autoFocus: false, modal: false, scrollY: false, removeOnClose: true, entryAnimation: 'fadein', entryAnimationDuration: 1, exitAnimation: 'none' });
  host.classList.add('sleekfin-popup-host');
  host.appendChild(layer);
  let ready = !host.style.animation;
  let closing = false;
  let closed = false;
  let notified = false;
  let pendingClose = false;
  let restoreFocus = true;
  let frame = 0;
  let completion;
  let container;
  let pointerEvents = '';
  let foreignFocus = null;
  const children = new Set();

  function dialogs() {
    return new Set(Array.from(document.querySelectorAll('.dialog.opened, .MuiModal-root')).filter((node) => node !== host && !host.contains(node) && !node.classList.contains('MuiModal-hidden') && node.getAttribute('aria-hidden') !== 'true' && isVisible(node)));
  }

  function notify() {
    if (notified) return;
    notified = true;
    onClose();
  }

  function close(restore = false) {
    if (closing || closed) return completion;
    restoreFocus = restore;
    if (!ready || children.size) {
      pendingClose = true;
      popup.hidden = true;
      notify();
      return completion;
    }
    helper.close(host);
    return completion;
  }

  function onReady(event) {
    if (event.target !== host || ready) return;
    ready = true;
    if (container) {
      if (pointerEvents) container.style.pointerEvents = pointerEvents;
      else container.style.removeProperty('pointer-events');
    }
    if (pendingClose && !children.size) close(restoreFocus);
  }

  function onClosing() {
    closing = true;
    popup.hidden = true;
    host.backdrop?.classList.add('sleekfin-menu-backdrop-closing');
    notify();
  }

  function onOwnerClosing() {
    // Jellyfin pops its current focus scope after the parent's closing event.
    close(false);
  }

  function onClosed() {
    if (closed) return;
    closed = true;
    observer.disconnect();
    window.cancelAnimationFrame(frame);
    document.removeEventListener('focusin', onFocus, true);
    document.removeEventListener('open', onDialogOpen, true);
    document.removeEventListener('fullscreenchange', movePortal);
    document.removeEventListener('webkitfullscreenchange', movePortal);
    host.removeEventListener('animationend', onReady);
    host.removeEventListener('webkitAnimationEnd', onReady);
    host.removeEventListener('closing', onClosing);
    host.removeEventListener('close', onClosed);
    owner?.removeEventListener('closing', onOwnerClosing);
    children.forEach((node) => node.removeEventListener('close', onChildClosed));
    children.clear();
    notify();
    if (restoreFocus && window.location.href === href && isVisible(trigger)) trigger.focus({ preventScroll: true });
    else if (!restoreFocus && document.activeElement === document.body && isVisible(foreignFocus)) foreignFocus.focus({ preventScroll: true });
  }

  function onFocus(event) {
    if (!closing && event.target !== document.body && event.target !== document.documentElement && !host.contains(event.target)) {
      const child = event.target.closest?.('.dialog.opened');
      if (child && !previousDialogs.has(child)) watchChild(child);
      foreignFocus = event.target;
      close(false);
    }
  }

  function inspectDialogs() {
    frame = 0;
    if (closing || closed) return;
    const next = dialogs();
    const added = [...next].filter((node) => !previousDialogs.has(node));
    added.filter((node) => node.classList.contains('dialog')).forEach(watchChild);
    if (added.length) close(false);
    previousDialogs = next;
  }

  function onChildClosed(event) {
    children.delete(event.target);
    event.target.removeEventListener('close', onChildClosed);
    if (pendingClose && ready && !children.size) close(restoreFocus);
  }

  function watchChild(node) {
    if (children.has(node)) return;
    children.add(node);
    node.addEventListener('close', onChildClosed);
  }

  function onDialogOpen(event) {
    const node = event.target;
    if (closing || closed || !node.classList?.contains('dialog') || node === host || host.contains(node)) return;
    // Native open precedes pushScope; an opened child must pop before its parent.
    if (ready && !children.size) close(false);
    else {
      watchChild(node);
      close(false);
    }
  }

  const observer = new MutationObserver((changes) => {
    if (!frame && changes.some(({ target }) => !host.contains(target))) frame = window.requestAnimationFrame(inspectDialogs);
  });

  function movePortal() {
    if (closing || closed || pendingClose) return;
    const parent = document.fullscreenElement || document.webkitFullscreenElement || document.body;
    const container = host.dialogContainer;
    if (container && container.parentElement !== parent) {
      if (host.backdrop) parent.appendChild(host.backdrop);
      parent.appendChild(container);
    }
  }

  host.addEventListener('closing', onClosing);
  host.addEventListener('close', onClosed);
  // Jellyfin otherwise restores its captured TV focus into a newer child dialog.
  document.activeElement?.blur?.();
  completion = helper.open(host);
  completion.catch(() => {
    console.warn('[SleekFin] TV dropdown dialog failed to open.');
    close(false);
  });
  host.addEventListener('animationend', onReady);
  host.addEventListener('webkitAnimationEnd', onReady);
  container = host.dialogContainer;
  if (!ready && container) {
    pointerEvents = container.style.pointerEvents;
    // Leave outside clicks on the backdrop until Jellyfin has pushed its focus scope.
    container.style.pointerEvents = 'none';
  }
  host.backdrop?.classList.add('sleekfin-menu-backdrop');
  movePortal();
  let previousDialogs = dialogs();
  owner?.addEventListener('closing', onOwnerClosing);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'aria-hidden'] });
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('open', onDialogOpen, true);
  document.addEventListener('fullscreenchange', movePortal);
  document.addEventListener('webkitfullscreenchange', movePortal);
  return { close, owns(target) {
    // Native inputManager can redirect fullscreen commands to a later background dialog.
    return host.contains(target) || host.contains(document.activeElement) && target?.matches?.('.dialog.opened');
  } };
}
