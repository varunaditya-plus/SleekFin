export function element(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

export function isConnected(target) {
  if (!target) return false;
  return typeof target.isConnected === 'boolean' ? target.isConnected : Boolean(document.documentElement?.contains(target));
}

export function isVisible(target) {
  if (!isConnected(target) || target.getClientRects().length === 0) return false;

  const style = window.getComputedStyle(target);
  return style.display !== 'none' && style.visibility !== 'hidden';
}

export function insertAfter(reference, element) {
  reference?.parentNode?.insertBefore(element, reference.nextSibling);
}

export function replace(current, replacement) {
  current?.parentNode?.replaceChild(replacement, current);
}

function observationRoot() {
  return document.getElementById('reactRoot') || document.body || document.documentElement;
}

export function watchSpa(callback, options) {
  const settings = options || {};
  const eventNames = settings.events || [];
  const observer = new MutationObserver(callback);
  observer.observe(observationRoot(), { childList: true, subtree: true });
  eventNames.forEach((eventName) => {
    window.addEventListener(eventName, callback);
  });
  if (settings.viewshow) {
    document.addEventListener('viewshow', callback);
  }

  return function stopWatching() {
    observer.disconnect();
    eventNames.forEach((eventName) => {
      window.removeEventListener(eventName, callback);
    });
    if (settings.viewshow) {
      document.removeEventListener('viewshow', callback);
    }
  };
}

// Line-clamped text can be expanded in place; the click is consumed only when text is actually cut off or open.
export function expandableText(element) {
  let expanded = false;
  let settle = null;
  const tabIndex = element.getAttribute('tabindex');
  const focusable = element.classList.contains('focusable');

  function restoreFocus() {
    element.classList.toggle('focusable', focusable);
    if (tabIndex === null) element.removeAttribute('tabindex');
    else element.setAttribute('tabindex', tabIndex);
  }

  function isTruncated() {
    return element.scrollHeight - element.clientHeight > 1;
  }

  function sync() {
    const active = expanded || isTruncated();
    element.style.cursor = active ? 'pointer' : '';
    if (active) element.title = expanded ? 'Click to collapse' : 'Click to expand';
    else element.removeAttribute('title');
    if (active && element.getClientRects().length && document.documentElement.classList.contains('layout-tv')) {
      element.classList.add('focusable');
      element.tabIndex = 0;
    } else restoreFocus();
  }

  function setExpanded(value) {
    expanded = value;
    if (value) element.dataset.sleekfinExpanded = 'true';
    else delete element.dataset.sleekfinExpanded;
    element.style.display = value ? 'block' : '';
    element.style.setProperty('-webkit-line-clamp', value ? 'unset' : '');
  }

  function animate(from, to, done) {
    let timer = 0;
    function finish(event) {
      if (event && event.target !== element) return;
      window.clearTimeout(timer);
      element.removeEventListener('transitionend', finish);
      settle = null;
      element.style.height = '';
      element.style.overflow = '';
      element.style.transition = '';
      done?.();
      sync();
    }
    settle = finish;
    element.style.height = `${from}px`;
    element.style.overflow = 'hidden';
    // Commit the start height before transitioning; otherwise the browser jumps straight to the end.
    element.getBoundingClientRect();
    element.style.transition = 'height 320ms cubic-bezier(0.22, 1, 0.36, 1)';
    element.style.height = `${to}px`;
    element.addEventListener('transitionend', finish);
    timer = window.setTimeout(finish, 400);
  }

  function toggle() {
    settle?.();
    const from = element.offsetHeight;
    if (!expanded) {
      setExpanded(true);
      animate(from, element.scrollHeight);
      return;
    }
    setExpanded(false);
    const to = element.offsetHeight;
    // Stay unclamped while shrinking so the ellipsis only appears once the motion ends.
    setExpanded(true);
    animate(from, to, () => setExpanded(false));
  }

  function onClick(event) {
    if ((!expanded && !isTruncated()) || event.target.closest('a')) return;
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }

  function onKeyDown(event) {
    if (!event.defaultPrevented && event.target === element && element.classList.contains('focusable') && ['Enter', ' '].includes(event.key)) onClick(event);
  }

  const observer = typeof window.ResizeObserver === 'function' ? new window.ResizeObserver(sync) : null;
  observer?.observe(element);
  if (!observer) window.addEventListener('resize', sync);
  element.addEventListener('click', onClick);
  element.addEventListener('keydown', onKeyDown);
  sync();

  return function destroy() {
    settle?.();
    observer?.disconnect();
    if (!observer) window.removeEventListener('resize', sync);
    element.removeEventListener('click', onClick);
    element.removeEventListener('keydown', onKeyDown);
    restoreFocus();
    setExpanded(false);
    element.style.cursor = '';
    element.removeAttribute('title');
  };
}

export default {
  element,
  expandableText,
  insertAfter,
  isConnected,
  isVisible,
  replace,
  watchSpa,
};
