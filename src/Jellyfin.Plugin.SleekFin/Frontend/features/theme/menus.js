import { isConnected, isVisible } from '../../shared/dom.js';

const NAVIGATION_EVENTS = ['hashchange', 'popstate', 'pagehide'];
const VIEW_EVENTS = ['viewbeforehide', 'viewdestroy'];
const POSITION_PROPERTIES = ['position', 'left', 'top', 'right', 'bottom', 'max-width', 'max-height'];

export function createMoreMenuFeature() {
  let started = false;
  let pending = null;
  let observer = null;
  let timer = 0;
  let current = null;

  function clearPending() {
    observer?.disconnect();
    observer = null;
    window.clearTimeout(timer);
    timer = 0;
    pending = null;
  }

  function stopPositioning() {
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  }

  function releaseMenu() {
    stopPositioning();
    if (!current) return;
    const { menu, styles, hadSurface, onClosing } = current;
    menu.removeEventListener('closing', onClosing);
    menu.removeEventListener('close', releaseMenu);
    menu.classList.remove('sleekfin-more-menu');
    if (!hadSurface) menu.classList.remove('sleekfin-control-3d');
    styles.forEach(({ property, value, priority }) => {
      if (value) menu.style.setProperty(property, value, priority);
      else menu.style.removeProperty(property);
    });
    current = null;
  }

  function cancel() {
    clearPending();
    releaseMenu();
  }

  function isActive(trigger, href) {
    // Jellyfin TV action sheets own fullscreen positioning and remote focus.
    return started && !document.documentElement.classList.contains('layout-tv') && document.documentElement.classList.contains('sleekfin-main-ui') && window.location.href === href && isVisible(trigger);
  }

  function position(event) {
    if (!current || current.closing || (event?.target?.nodeType && current.menu.contains(event.target))) return;
    const { menu, trigger, href, scroller } = current;
    if (!isConnected(menu) || !isActive(trigger, href)) {
      releaseMenu();
      return;
    }
    
    const margin = 8;
    const gap = 6;
    const rect = trigger.getBoundingClientRect();
    const widthLimit = Math.max(0, window.innerWidth - margin * 2);
    const heightLimit = Math.max(0, window.innerHeight - margin * 2);

    menu.style.setProperty('position', 'fixed', 'important');
    menu.style.setProperty('right', 'auto', 'important');
    menu.style.setProperty('bottom', 'auto', 'important');
    menu.style.setProperty('max-width', `${widthLimit}px`, 'important');
    menu.style.setProperty('max-height', `${heightLimit}px`, 'important');

    const contentHeight = Math.ceil(menu.scrollHeight + menu.offsetHeight - menu.clientHeight + Math.max(0, (scroller?.scrollHeight || 0) - (scroller?.clientHeight || 0)));
    const below = Math.max(0, window.innerHeight - rect.bottom - gap - margin);
    const above = Math.max(0, rect.top - gap - margin);
    const placeAbove = below < contentHeight && above > below;
    menu.style.setProperty('max-height', `${Math.min(heightLimit, placeAbove ? above : below)}px`, 'important');

    // The native entry animation scales client bounds, so clamp the untransformed layout size.
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin));
    const targetTop = placeAbove ? rect.top - gap - height : rect.bottom + gap;
    const top = Math.max(margin, Math.min(targetTop, window.innerHeight - height - margin));
    menu.style.setProperty('left', `${left}px`, 'important');
    menu.style.setProperty('top', `${top}px`, 'important');
  }

  function adopt(menu) {
    const { trigger, href } = pending;
    clearPending();
    releaseMenu();
    
    const styles = POSITION_PROPERTIES.map((property) => ({ property, value: menu.style.getPropertyValue(property), priority: menu.style.getPropertyPriority(property) }));
    const onClosing = () => {
      if (current?.menu !== menu) return;
      current.closing = true;
      stopPositioning();
    };

    current = { menu, trigger, href, styles, onClosing, closing: false, hadSurface: menu.classList.contains('sleekfin-control-3d'), scroller: menu.querySelector('.actionSheetScroller') };
    menu.classList.add('sleekfin-more-menu', 'sleekfin-control-3d');
    menu.addEventListener('closing', onClosing);
    menu.addEventListener('close', releaseMenu);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    position();
  }

  function onMutations(records) {
    if (!pending || !isActive(pending.trigger, pending.href)) {
      clearPending();
      return;
    }
    // Jellyfin appends the completed dialogContainer directly to body before positioning the sheet.
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || !node.classList.contains('dialogContainer')) continue;
        const menu = node.querySelector('.dialog.actionSheet');
        if (isConnected(menu) && !menu.classList.contains('hide')) {
          adopt(menu);
          return;
        }
      }
    }
  }

  function onClick(event) {
    const trigger = event.target?.closest?.('.btnMoreCommands, .itemAction');
    if (!trigger || (!trigger.classList.contains('btnMoreCommands') && trigger.dataset.action !== 'menu') || trigger.disabled || !isActive(trigger, window.location.href)) {
      clearPending();
      return;
    }
    cancel();
    pending = { trigger, href: window.location.href };
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { childList: true });
    timer = window.setTimeout(clearPending, 10000);
  }

  function onViewHide(event) {
    const trigger = current?.trigger || pending?.trigger;
    if (trigger && event.target.contains(trigger)) cancel();
  }

  function start() {
    if (started || !document.body) return;
    started = true;
    document.addEventListener('click', onClick, true);
    NAVIGATION_EVENTS.forEach((name) => window.addEventListener(name, cancel));
    VIEW_EVENTS.forEach((name) => document.addEventListener(name, onViewHide));
  }

  function stop() {
    if (!started) return;
    started = false;
    document.removeEventListener('click', onClick, true);
    NAVIGATION_EVENTS.forEach((name) => window.removeEventListener(name, cancel));
    VIEW_EVENTS.forEach((name) => document.removeEventListener(name, onViewHide));
    cancel();
  }

  return { start, stop };
}
