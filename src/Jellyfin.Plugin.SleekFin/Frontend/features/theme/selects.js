import { isConnected, isVisible } from '../../shared/dom.js';
import { createPopupDialog, isTvBackspace } from '../../shared/popupDialog.js';
import { positionPopup, watchPopupPosition } from '../../shared/popupPosition.js';

const NAVIGATION_EVENTS = ['hashchange', 'popstate', 'pagehide'];
const KEY_CODES = { 8: 'Backspace', 9: 'Tab', 13: 'Enter', 27: 'Escape', 32: ' ', 35: 'End', 36: 'Home', 37: 'ArrowLeft', 38: 'ArrowUp', 39: 'ArrowRight', 40: 'ArrowDown', 115: 'F4', 138: 'ArrowUp', 139: 'ArrowDown', 140: 'ArrowLeft', 141: 'ArrowRight', 195: 'Enter', 196: 'Escape', 203: 'ArrowUp', 204: 'ArrowDown', 205: 'ArrowLeft', 206: 'ArrowRight', 211: 'ArrowUp', 212: 'ArrowDown', 213: 'ArrowRight', 214: 'ArrowLeft', 461: 'Escape', 10009: 'Escape' };
const POPUP_ATTRIBUTES = ['aria-expanded', 'aria-controls', 'aria-activedescendant'];
let nextSelectId = 0;

export function createSelectFeature() {
  let started = false;
  let current = null;
  let observer = null;
  let frame = 0;
  let timer = 0;
  let searchTimer = 0;
  let searchText = '';
  let pointerSelect = null;
  let session = 0;

  function usable(select) {
    return started && document.documentElement.classList.contains('sleekfin-menu-ui') && select?.tagName === 'SELECT' && !select.multiple && select.size <= 1 && !select.matches(':disabled') && !select.hidden && !select.closest('[data-sleekfin-details-preview], [aria-hidden="true"], [inert]') && isVisible(select);
  }

  function consume(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function close(restoreFocus = false) {
    if (!current) return;
    const { select, layer, attributes, dialog, stopPosition } = current;
    current = null;
    observer?.disconnect();
    stopPosition?.();
    window.clearInterval(timer);
    window.clearTimeout(searchTimer);
    window.cancelAnimationFrame(frame);
    frame = timer = searchTimer = 0;
    searchText = '';
    layer.remove();
    POPUP_ATTRIBUTES.forEach((name, index) => {
      if (attributes[index] === null) select.removeAttribute(name);
      else select.setAttribute(name, attributes[index]);
    });
    if (dialog) return dialog.close(restoreFocus);
    if (restoreFocus && usable(select)) select.focus({ preventScroll: true });
  }

  function syncSelection(scroll = true) {
    if (!current) return;
    const { select, options, nodes, menu } = current;
    nodes.forEach((node, index) => {
      const selected = String(options[index].selected);
      const active = String(index === current.index);
      if (node.dataset.selected !== selected) {
        node.dataset.selected = selected;
        node.setAttribute('aria-selected', selected);
      }
      if (node.dataset.active !== active) node.dataset.active = active;
    });
    const node = nodes[current.index];
    if (node && select.getAttribute('aria-activedescendant') !== node.id) select.setAttribute('aria-activedescendant', node.id);
    else if (!node) select.removeAttribute('aria-activedescendant');
    if (scroll && node && node.offsetTop < menu.scrollTop) menu.scrollTop = node.offsetTop;
    else if (scroll && node && node.offsetTop + node.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = node.offsetTop + node.offsetHeight - menu.clientHeight;
  }

  function setIndex(index) {
    if (!current || current.nodes[index]?.disabled) return;
    current.index = index;
    syncSelection();
  }

  function move(direction, edge = false) {
    if (!current) return;
    const { nodes, index } = current;
    for (let next = edge ? (direction > 0 ? 0 : nodes.length - 1) : index + direction; next >= 0 && next < nodes.length; next += direction) {
      if (!nodes[next].disabled) {
        setIndex(next);
        return;
      }
    }
  }

  function choose(index) {
    if (!current || current.nodes[index]?.disabled || !current.options[index]) return;
    const { select, options, href, session: selectionSession } = current;
    const option = options[index];
    function apply() {
      const nextIndex = Array.from(select.options).indexOf(option);
      if (nextIndex < 0 || select.selectedIndex === nextIndex || selectionSession !== session || !usable(select) || window.location.href !== href) return;
      select.selectedIndex = nextIndex;
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const closing = close(true);
    if (closing) closing.then(apply);
    else apply();
  }

  function renderOptions() {
    if (!current) return;
    const { select, menu } = current;
    const priorOption = current.options[current.index];
    menu.textContent = '';
    current.options = [];
    current.nodes = [];
    let lastGroup = null;
    Array.from(select.options).forEach((option) => {
      const group = option.parentElement?.tagName === 'OPTGROUP' ? option.parentElement : null;
      if (option.hidden || group?.hidden) return;
      if (group && group !== lastGroup) {
        const label = document.createElement('div');
        label.className = 'sleekfin-select-group';
        label.textContent = group.label;
        menu.appendChild(label);
      }
      lastGroup = group;
      const index = current.options.length;
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'sleekfin-select-option';
      node.id = `${menu.id}-${index}`;
      node.tabIndex = -1;
      node.dataset.index = String(index);
      node.setAttribute('role', 'option');
      node.disabled = option.disabled || Boolean(group?.disabled);
      node.innerHTML = '<span></span><span class="material-icons check sleekfin-menu-check" aria-hidden="true"></span>';
      node.firstElementChild.textContent = option.label;
      menu.appendChild(node);
      current.options.push(option);
      current.nodes.push(node);
    });
    const priorIndex = current.options.indexOf(priorOption);
    current.index = priorIndex >= 0 && !current.nodes[priorIndex].disabled ? priorIndex : current.options.findIndex((option, index) => option.selected && !current.nodes[index].disabled);
    if (current.index < 0) current.index = current.nodes.findIndex((node) => !node.disabled);
    current.optionsChanged = false;
    syncSelection();
  }

  function position() {
    if (!current) return false;
    if (!usable(current.select) || window.location.href !== current.href) {
      close();
      return false;
    }
    return positionPopup(current.layer, current.menu, current.select);
  }

  function reconcile() {
    frame = 0;
    if (!current) return;
    if (current.optionsChanged) {
      renderOptions();
      if (!current.options.length) close(true);
    }
    position();
  }

  function schedule() {
    if (current && !frame) frame = window.requestAnimationFrame(reconcile);
  }

  function onMutations(records) {
    if (!current) return;
    const { select, menu } = current;
    if (!isConnected(select)) {
      close();
      return;
    }
    records.forEach(({ target }) => {
      const node = target.nodeType === 1 ? target : target.parentElement;
      if (!node || menu.contains(node)) return;
      if (select.contains(node)) current.optionsChanged = true;
      if (select.contains(node) || node.contains(select)) schedule();
    });
  }

  function open(select) {
    if (current?.select === select) return;
    close();
    if (!usable(select)) return;
    const menu = document.createElement('div');
    const layer = document.createElement('div');
    layer.className = 'sleekfin-popup-layer';
    menu.className = 'sleekfin-select-menu';
    menu.id = `sleekfin-select-menu-${++nextSelectId}`;
    menu.setAttribute('role', 'listbox');
    if (select.id) menu.setAttribute('aria-labelledby', select.id);
    else if (select.getAttribute('aria-label')) menu.setAttribute('aria-label', select.getAttribute('aria-label'));
    layer.appendChild(menu);
    current = { select, menu, layer, attributes: POPUP_ATTRIBUTES.map((name) => select.getAttribute(name)), href: window.location.href, session: ++session, options: [], nodes: [], index: -1, optionsChanged: false, dialog: null, stopPosition: null };
    select.setAttribute('aria-expanded', 'true');
    select.setAttribute('aria-controls', menu.id);
    (select.closest('.dialogContainer, .MuiDialog-root') || document.fullscreenElement || document.webkitFullscreenElement || document.body).appendChild(layer);
    select.focus({ preventScroll: true });
    renderOptions();
    if (!current.options.length) {
      close(true);
      return;
    }
    current.dialog = createPopupDialog(layer, menu, select, () => { if (current?.menu === menu) close(); });
    if (!position()) {
      close();
      return;
    }
    current.stopPosition = watchPopupPosition(layer, menu, select, position, () => { if (current?.menu === menu) close(); });
    if (current.dialog) {
      menu.tabIndex = -1;
      menu.focus({ preventScroll: true });
    }
    syncSelection();
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'hidden', 'inert', 'aria-hidden', 'disabled', 'multiple', 'size', 'selected', 'value', 'label'], childList: true, characterData: true, subtree: true });
    // Assigning select.value does not emit an event or mutate its option attributes.
    timer = window.setInterval(() => {
      if (!usable(select)) close();
      else syncSelection(false);
    }, 150);
  }

  function onMouseDown(event) {
    pointerSelect = null;
    if (event.button) return;
    if (current?.menu.contains(event.target)) {
      event.preventDefault();
      return;
    }
    const select = event.target?.closest?.('select');
    // Jellyfin opens legacy sheets before the browser's mousedown focus step.
    if (select?.closest('[data-sleekfin-details-preview]') && !select.matches(':disabled') && isVisible(select)) select.focus({ preventScroll: true });
    if (usable(select)) {
      consume(event);
      pointerSelect = select;
      if (current?.select === select) close(true);
      else open(select);
    } else if (current && !current.dialog) close();
  }

  function onClick(event) {
    const option = event.target?.closest?.('.sleekfin-select-option');
    if (current && option && current.menu.contains(option)) {
      consume(event);
      choose(Number(option.dataset.index));
      return;
    }
    const select = event.target?.closest?.('select');
    if (!usable(select)) return;
    consume(event);
    if (pointerSelect !== select) open(select);
    pointerSelect = null;
  }

  function onTouchStart(event) {
    pointerSelect = null;
    const select = event.target?.closest?.('select');
    if (usable(select)) {
      consume(event);
      if (current?.select === select) close(true);
      else open(select);
    } else if (current && !current.dialog && !current.menu.contains(event.target)) close();
  }

  function search(character) {
    if (!current) return;
    const repeated = searchText && Array.from(searchText).every((value) => value === character);
    searchText = repeated ? character : searchText + character;
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => { searchText = ''; }, 700);
    const { options, nodes, index } = current;
    for (const prefix of searchText.length > 1 ? [searchText, character] : [searchText]) {
      for (let offset = repeated ? 1 : 0; offset < options.length + (repeated ? 1 : 0); offset += 1) {
        const next = (Math.max(0, index) + offset) % options.length;
        if (!nodes[next].disabled && options[next].label.toLocaleLowerCase().startsWith(prefix)) {
          searchText = prefix;
          setIndex(next);
          return;
        }
      }
    }
  }

  function onKeyDown(event) {
    const select = current?.select || event.target?.closest?.('select');
    if (!usable(select) || (!current && event.target !== select)) return;
    if (current && event.target !== select && !current.menu.contains(event.target) && !current.dialog?.owns(event.target)) return;
    pointerSelect = null;
    const key = KEY_CODES[event.keyCode || event.which] || (event.key === 'Spacebar' ? ' ' : event.key);
    const tv = document.documentElement.classList.contains('layout-tv');
    if (key === 'Tab') {
      close();
      return;
    }
    if (key === 'Escape' && current || key === 'Backspace' && current && isTvBackspace() || key === 'F4' && current || event.altKey && key === 'ArrowUp' && current) {
      consume(event);
      close(true);
    } else if (key === 'F4') {
      consume(event);
      open(select);
    } else if (key === 'Backspace' && current && searchText) {
      consume(event);
      searchText = searchText.slice(0, -1);
    } else if (key === ' ' && current && searchText && current.options.some((option) => option.label.toLocaleLowerCase().startsWith(`${searchText} `))) {
      consume(event);
      search(' ');
    } else if (key === 'Enter' || key === ' ') {
      consume(event);
      if (current) choose(current.index);
      else open(select);
    } else if (key === 'ArrowUp' || key === 'ArrowDown') {
      if (!current && tv && !event.altKey) return;
      consume(event);
      if (current && !event.altKey) move(key === 'ArrowDown' ? 1 : -1);
      else open(select);
    } else if (current && (key === 'Home' || key === 'End')) {
      consume(event);
      move(key === 'Home' ? 1 : -1, true);
    } else if (current && tv && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      consume(event);
    } else if (key?.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      consume(event);
      open(select);
      search(key.toLocaleLowerCase());
    }
  }

  function onCommand(event) {
    const command = event.detail?.command;
    if (!current) {
      const select = event.target?.closest?.('select');
      if (command === 'select' && usable(select)) {
        consume(event);
        open(select);
      }
      return;
    }
    if (!current.menu.contains(event.target) && event.target !== current.select && !current.dialog?.owns(event.target)) return;
    if (!['up', 'down', 'left', 'right', 'select', 'back'].includes(command)) return;
    consume(event);
    if (command === 'up' || command === 'down') move(command === 'down' ? 1 : -1);
    else if (command === 'select') choose(current.index);
    else if (command === 'back') close(true);
  }

  function onFocus(event) {
    if (current && event.target !== current.select && !current.menu.contains(event.target)) close();
  }

  function onPointerMove(event) {
    if (event.pointerType === 'touch') return;
    const option = event.target?.closest?.('.sleekfin-select-option');
    if (current && option && current.menu.contains(option)) setIndex(Number(option.dataset.index));
  }

  function onViewHide(event) {
    if (current && event.target.contains(current.select)) close();
  }

  function onNavigation() {
    session += 1;
    pointerSelect = null;
    close();
  }

  const handlers = { mousedown: onMouseDown, click: onClick, touchstart: onTouchStart, keydown: onKeyDown, command: onCommand, focusin: onFocus, pointermove: onPointerMove };

  function start() {
    if (started || !document.body) return;
    started = true;
    observer = new MutationObserver(onMutations);
    Object.entries(handlers).forEach(([name, handler]) => document.addEventListener(name, handler, { capture: true, passive: false }));
    NAVIGATION_EVENTS.forEach((name) => window.addEventListener(name, onNavigation));
    document.addEventListener('viewbeforehide', onViewHide);
    document.addEventListener('viewdestroy', onViewHide);
    document.addEventListener('fullscreenchange', onNavigation);
    document.addEventListener('webkitfullscreenchange', onNavigation);
  }

  function stop() {
    if (!started) return;
    started = false;
    session += 1;
    close();
    observer?.disconnect();
    observer = null;
    Object.entries(handlers).forEach(([name, handler]) => document.removeEventListener(name, handler, true));
    NAVIGATION_EVENTS.forEach((name) => window.removeEventListener(name, onNavigation));
    document.removeEventListener('viewbeforehide', onViewHide);
    document.removeEventListener('viewdestroy', onViewHide);
    document.removeEventListener('fullscreenchange', onNavigation);
    document.removeEventListener('webkitfullscreenchange', onNavigation);
    pointerSelect = null;
  }

  return { start, stop };
}
