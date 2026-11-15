import { dom } from '../../shared/runtime.js';
import { createPopupDialog, isTvBackspace } from '../../shared/popupDialog.js';
import { positionPopup, watchPopupPosition } from '../../shared/popupPosition.js';

let nextDropdownId = 0;

function keyFor(event) {
  const keyCode = event.keyCode || event.which;
  const specialKeys = {
    8: 'Backspace',
    9: 'Tab',
    13: 'Enter',
    27: 'Escape',
    32: ' ',
    35: 'End',
    36: 'Home',
    37: 'ArrowLeft',
    38: 'ArrowUp',
    39: 'ArrowRight',
    40: 'ArrowDown',
    138: 'ArrowUp',
    139: 'ArrowDown',
    140: 'ArrowLeft',
    141: 'ArrowRight',
    195: 'Enter',
    196: 'Escape',
    203: 'ArrowUp',
    204: 'ArrowDown',
    205: 'ArrowLeft',
    206: 'ArrowRight',
    211: 'ArrowUp',
    212: 'ArrowDown',
    213: 'ArrowRight',
    214: 'ArrowLeft',
    461: 'Escape',
    10009: 'Escape',
  };
  if (specialKeys[keyCode]) return specialKeys[keyCode];
  if (event.key && event.key !== 'Unidentified') return event.key === 'Spacebar' ? ' ' : event.key;
  const characterCode = keyCode >= 96 && keyCode <= 105 ? keyCode - 48 : keyCode;
  return ((characterCode >= 48 && characterCode <= 57) || (characterCode >= 65 && characterCode <= 90)) ? String.fromCharCode(characterCode).toLocaleLowerCase() : '';
}

export function createDropdown({ root, trigger, options = [], value = '', onSelect = () => {}, portal = document.body }) {
  if (!root || !trigger) return { update() {}, destroy() {} };

  let id = trigger.id;
  while (!id || (document.getElementById(id) && document.getElementById(id) !== trigger) || document.getElementById(`${id}-menu`)) {
    nextDropdownId += 1;
    id = `sleekfin-details-dropdown-${nextDropdownId}`;
  }

  const layer = document.createElement('div');
  layer.className = 'sleekfin-details-dropdown-layer sleekfin-popup-layer';
  layer.hidden = true;
  const menu = document.createElement('div');
  menu.className = 'sleekfin-details-dropdown-menu sleekfin-control-3d';
  menu.id = `${id}-menu`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-labelledby', id);
  menu.style.visibility = 'hidden';
  menu.addEventListener('mousedown', (event) => event.preventDefault());
  layer.appendChild(menu);
  portal.appendChild(layer);

  trigger.id = id;
  trigger.setAttribute('role', 'combobox');
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-controls', menu.id);
  trigger.setAttribute('aria-expanded', 'false');

  let currentOptions = [];
  let optionNodes = [];
  let optionsSignature = '';
  let selectedValue = String(value ?? '');
  let activeIndex = 0;
  let open = false;
  let typeahead = '';
  let typeaheadTimer = 0;
  let destroyed = false;
  let stopPosition = null;
  let dialog = null;
  let href = '';
  let session = 0;

  function selectedIndex() {
    return currentOptions.findIndex((option) => option.value === selectedValue);
  }

  function syncAria() {
    optionNodes.forEach((optionNode, index) => {
      const selected = currentOptions[index]?.value === selectedValue;
      optionNode.setAttribute('aria-selected', String(selected));
      optionNode.dataset.selected = String(selected);
      optionNode.dataset.active = String(open && index === activeIndex);
    });
    if (open && optionNodes[activeIndex]) trigger.setAttribute('aria-activedescendant', optionNodes[activeIndex].id);
    else trigger.removeAttribute('aria-activedescendant');
    const selected = currentOptions[selectedIndex()];
    trigger.title = selected?.label || '';
  }

  function renderOptions() {
    menu.textContent = '';
    optionNodes = currentOptions.map((option, index) => {
      const optionNode = document.createElement('div');
      optionNode.className = 'sleekfin-details-dropdown-option';
      optionNode.id = `${menu.id}-option-${index}`;
      optionNode.setAttribute('role', 'option');
      optionNode.innerHTML = '<span></span><span class="material-icons check sleekfin-menu-check" aria-hidden="true"></span>';
      optionNode.firstElementChild.textContent = option.label;
      optionNode.addEventListener('click', () => choose(index));
      optionNode.addEventListener('pointermove', () => setActive(index));
      menu.appendChild(optionNode);
      return optionNode;
    });
    syncAria();
  }

  function position() {
    if (!open) return false;
    if (!dom.isVisible(trigger) || trigger.closest('[aria-hidden="true"], [inert]') || window.location.href !== href) {
      close();
      return false;
    }
    if (!positionPopup(layer, menu, trigger)) return false;
    menu.style.visibility = 'visible';
    return true;
  }

  function setActive(index) {
    if (!currentOptions.length) return;
    const nextIndex = Math.max(0, Math.min(currentOptions.length - 1, index));
    if (activeIndex === nextIndex) return;
    activeIndex = nextIndex;
    syncAria();
    if (open) scrollActiveOption();
  }

  function scrollActiveOption() {
    const option = optionNodes[activeIndex];
    if (!option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }

  function stopWatching() {
    document.removeEventListener('mousedown', onOutside);
    document.removeEventListener('touchstart', onOutside);
    stopPosition?.();
    stopPosition = null;
    document.removeEventListener('keydown', onPopupKeyDown, true);
    document.removeEventListener('command', onCommand, true);
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
  }

  function close(restoreFocus = false) {
    if (!open) return;
    open = false;
    root.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    menu.style.visibility = 'hidden';
    layer.hidden = true;
    activeIndex = Math.max(0, selectedIndex());
    syncAria();
    stopWatching();
    window.clearTimeout(typeaheadTimer);
    typeahead = '';
    const closingDialog = dialog;
    dialog = null;
    if (closingDialog) {
      layer.remove();
      return closingDialog.close(restoreFocus);
    }
    if (restoreFocus && dom.isVisible(trigger)) trigger.focus({ preventScroll: true });
  }

  function onOutside(event) {
    if (!dialog && !root.contains(event.target) && !menu.contains(event.target)) close();
  }

  function onFullscreenChange() {
    close();
  }

  function openMenu(index = selectedIndex(), preserveTypeahead = false) {
    if (destroyed || open || trigger.disabled || !currentOptions.length || !dom.isVisible(trigger)) return;
    if (!preserveTypeahead) {
      window.clearTimeout(typeaheadTimer);
      typeahead = '';
    }
    session += 1;
    href = window.location.href;
    layer.hidden = false;
    menu.hidden = false;
    (trigger.closest('.dialogContainer, .MuiDialog-root') || document.fullscreenElement || document.webkitFullscreenElement || portal).appendChild(layer);
    dialog = createPopupDialog(layer, menu, trigger, () => { if (open) close(); });
    open = true;
    root.dataset.open = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    activeIndex = Math.max(0, index < 0 ? 0 : index);
    syncAria();
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside, { passive: true });
    document.addEventListener('keydown', onPopupKeyDown, true);
    document.addEventListener('command', onCommand, true);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    if (!position()) {
      close();
      return;
    }
    stopPosition = watchPopupPosition(layer, menu, trigger, position, close);
    if (dialog) {
      menu.tabIndex = -1;
      menu.focus({ preventScroll: true });
    }
    scrollActiveOption();
  }

  function choose(index) {
    const option = currentOptions[index];
    if (!option) return;
    const selectionSession = session;
    const selectionHref = href;
    function apply() {
      if (destroyed || selectionSession !== session || !currentOptions.some((current) => current.value === option.value) || window.location.href !== selectionHref || !dom.isVisible(trigger) || trigger.disabled) return;
      selectedValue = option.value;
      syncAria();
      onSelect(option);
    }
    const closing = close(true);
    if (closing) closing.then(apply);
    else apply();
  }

  function findOption(prefix, start, preferExact = true) {
    if (preferExact) {
      const exactIndex = currentOptions.findIndex((option) => option.label.toLocaleLowerCase() === prefix);
      if (exactIndex >= 0) return exactIndex;
    }
    for (let offset = 0; offset < currentOptions.length; offset += 1) {
      const index = (start + offset) % currentOptions.length;
      if (currentOptions[index].label.toLocaleLowerCase().startsWith(prefix)) return index;
    }
    return -1;
  }

  function search(key) {
    const character = key.toLocaleLowerCase();
    const repeated = typeahead && Array.from(typeahead).every((value) => value === character);
    const prefix = repeated ? character : `${typeahead}${character}`;
    let index = findOption(prefix, repeated ? (activeIndex + 1) % currentOptions.length : activeIndex, !repeated);
    let matchedPrefix = prefix;
    if (index < 0 && !repeated && typeahead) {
      matchedPrefix = character;
      index = findOption(matchedPrefix, activeIndex);
    }
    window.clearTimeout(typeaheadTimer);
    typeahead = index < 0 ? '' : matchedPrefix;
    if (!typeahead) return;
    typeaheadTimer = window.setTimeout(() => { typeahead = ''; }, 700);
    if (open) setActive(index);
    else openMenu(index, true);
  }

  function onKeyDown(event) {
    const key = keyFor(event);
    const tv = document.documentElement.classList.contains('layout-tv');
    if (key === 'Backspace' && open && isTvBackspace() && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (key === 'Tab') {
      if (open) choose(activeIndex);
      return;
    }
    if (key === 'Backspace' && typeahead) {
      event.preventDefault();
      typeahead = typeahead.slice(0, -1);
      window.clearTimeout(typeaheadTimer);
      const index = typeahead ? findOption(typeahead, activeIndex) : -1;
      if (index < 0) {
        typeahead = '';
      } else {
        typeaheadTimer = window.setTimeout(() => { typeahead = ''; }, 700);
        if (open) setActive(index);
        else openMenu(index, true);
      }
      return;
    }
    if (key === 'ArrowDown' || key === 'ArrowUp') {
      if (tv && !open) return;
      event.preventDefault();
      if (open) setActive(activeIndex + (key === 'ArrowDown' ? 1 : -1));
      else openMenu(selectedIndex());
      return;
    }
    if ((key === 'Home' || key === 'End') && open) {
      event.preventDefault();
      setActive(key === 'Home' ? 0 : currentOptions.length - 1);
      return;
    }
    if (key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (tv && open && (key === 'ArrowLeft' || key === 'ArrowRight')) {
      event.preventDefault();
      return;
    }
    if (key === ' ' && typeahead && currentOptions.some((option) => option.label.toLocaleLowerCase().startsWith(`${typeahead} `))) {
      event.preventDefault();
      search(key);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(activeIndex);
      else openMenu(selectedIndex());
      return;
    }
    if (key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey && currentOptions.length) {
      event.preventDefault();
      search(key);
    }
  }

  function onPopupKeyDown(event) {
    if (menu.contains(event.target) || dialog?.owns(event.target)) onKeyDown(event);
  }

  function onCommand(event) {
    if (!document.documentElement.classList.contains('layout-tv') || !open || event.target !== trigger && !menu.contains(event.target) && !dialog?.owns(event.target) || !['up', 'down', 'left', 'right', 'select', 'back'].includes(event.detail?.command)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const command = event.detail.command;
    if (command === 'up' || command === 'down') setActive(activeIndex + (command === 'down' ? 1 : -1));
    else if (command === 'select') choose(activeIndex);
    else if (command === 'back') close(true);
  }

  function onFocusOut(event) {
    if (open && (!event.relatedTarget || (!root.contains(event.relatedTarget) && !menu.contains(event.relatedTarget)))) close();
  }

  function onTriggerClick() {
    if (open) close();
    else openMenu();
  }

  trigger.addEventListener('click', onTriggerClick);
  trigger.addEventListener('keydown', onKeyDown);
  trigger.addEventListener('focusout', onFocusOut);

  function update(nextOptions, nextValue = selectedValue) {
    if (destroyed) return;
    const priorActiveValue = currentOptions[activeIndex]?.value;
    currentOptions = Array.from(nextOptions || [], (option) => ({ value: String(option.value ?? ''), label: String(option.label ?? '') }));
    selectedValue = String(nextValue ?? '');
    const nextSignature = currentOptions.map((option) => `${option.value}\u0000${option.label}`).join('\u0001');
    if (nextSignature !== optionsSignature) {
      optionsSignature = nextSignature;
      const selected = selectedIndex();
      const previous = currentOptions.findIndex((option) => option.value === priorActiveValue);
      activeIndex = open && previous >= 0 ? previous : Math.max(0, selected);
      renderOptions();
    } else {
      const selected = selectedIndex();
      if (!open) activeIndex = Math.max(0, selected);
      syncAria();
    }
    if (!currentOptions.length || trigger.disabled) close();
    else if (open) position();
  }

  function destroy() {
    if (destroyed) return;
    close();
    destroyed = true;
    trigger.removeEventListener('keydown', onKeyDown);
    trigger.removeEventListener('focusout', onFocusOut);
    trigger.removeEventListener('click', onTriggerClick);
    layer.remove();
    window.clearTimeout(typeaheadTimer);
  }

  update(options, selectedValue);
  return { close, destroy, update };
}
