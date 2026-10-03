import { dom } from '../../shared/runtime.js';

const MIN_USABLE_HEIGHT = 240;
let nextDropdownId = 0;

function keyFor(event) {
  if (event.key) return event.key === 'Spacebar' ? ' ' : event.key;
  const keyCode = event.keyCode || event.which;
  const specialKeys = {
    9: 'Tab',
    13: 'Enter',
    27: 'Escape',
    32: ' ',
    35: 'End',
    36: 'Home',
    38: 'ArrowUp',
    40: 'ArrowDown',
  };
  if (specialKeys[keyCode]) return specialKeys[keyCode];
  const characterCode = keyCode >= 96 && keyCode <= 105 ? keyCode - 48 : keyCode;
  return (characterCode >= 48 && characterCode <= 90) ? String.fromCharCode(characterCode).toLocaleLowerCase() : '';
}

function setAttribute(element, name, value) {
  if (value === null) element.removeAttribute(name);
  else element.setAttribute(name, value);
}

export function createDropdown({ root, trigger, options = [], value = '', onSelect = () => {}, maxWidth = 520 }) {
  if (!root || !trigger) return { update() {}, destroy() {} };

  const managedAttributes = ['id', 'role', 'aria-haspopup', 'aria-controls', 'aria-expanded', 'aria-activedescendant'];
  const originalAttributes = new Map(managedAttributes.map((name) => [name, trigger.hasAttribute(name) ? trigger.getAttribute(name) : null]));
  const originalTitle = trigger.hasAttribute('title') ? trigger.getAttribute('title') : null;
  const originalRootOpen = root.hasAttribute('data-open') ? root.getAttribute('data-open') : null;
  let id = trigger.id;
  while (!id || (document.getElementById(id) && document.getElementById(id) !== trigger) || document.getElementById(`${id}-menu`)) {
    nextDropdownId += 1;
    id = `sleekfin-details-dropdown-${nextDropdownId}`;
  }

  const layer = document.createElement('div');
  layer.className = 'sleekfin-details-dropdown-layer';
  const menu = document.createElement('div');
  menu.className = 'sleekfin-details-dropdown-menu sleekfin-control-3d';
  menu.id = `${id}-menu`;
  menu.setAttribute('role', 'listbox');
  menu.setAttribute('aria-labelledby', id);
  menu.dataset.positioned = 'false';
  menu.style.visibility = 'hidden';
  menu.addEventListener('mousedown', (event) => event.preventDefault());
  layer.appendChild(menu);
  document.body.appendChild(layer);

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
      optionNode.dataset.value = option.value;
      const label = document.createElement('span');
      label.textContent = option.label;
      optionNode.appendChild(label);
      optionNode.addEventListener('click', () => choose(index));
      optionNode.addEventListener('pointermove', () => setActive(index));
      menu.appendChild(optionNode);
      return optionNode;
    });
    syncAria();
  }

  function position() {
    if (!open || !dom.isConnected(trigger) || !dom.isConnected(menu)) return;
    const triggerRect = trigger.getBoundingClientRect();
    const margin = 8;
    const gap = 6;
    const widthLimit = Math.max(0, Math.min(maxWidth, window.innerWidth * 0.7));
    const minWidth = Math.min(triggerRect.width, widthLimit);
    menu.style.maxWidth = `${widthLimit}px`;
    menu.style.maxHeight = 'none';
    menu.style.minWidth = `${minWidth}px`;
    const contentHeight = Math.ceil(menu.scrollHeight);
    const menuWidth = Math.ceil(menu.getBoundingClientRect().width);
    const cap = Math.min(420, window.innerHeight * 0.5);
    const spaceBelow = Math.max(0, window.innerHeight - triggerRect.bottom - gap - margin);
    const spaceAbove = Math.max(0, triggerRect.top - gap - margin);
    let placement = 'below';
    if (spaceBelow < contentHeight) {
      const usableBelow = spaceBelow >= MIN_USABLE_HEIGHT;
      if (!usableBelow && (spaceAbove >= contentHeight || spaceAbove > spaceBelow)) placement = 'above';
    }
    const available = placement === 'above' ? spaceAbove : spaceBelow;
    const height = Math.max(0, Math.floor(Math.min(contentHeight, cap, available)));
    const width = Math.max(minWidth, Math.min(menuWidth, widthLimit));
    const left = Math.max(margin, Math.min(triggerRect.left, window.innerWidth - width - margin));
    const top = placement === 'above' ? Math.max(margin, triggerRect.top - gap - height) : triggerRect.bottom + gap;

    menu.dataset.placement = placement;
    menu.style.left = `${left}px`;
    menu.style.maxHeight = `${height}px`;
    menu.style.minWidth = `${minWidth}px`;
    menu.style.width = `${width}px`;
    menu.style.top = `${top}px`;
    menu.dataset.positioned = 'true';
    menu.style.visibility = 'visible';
  }

  function setActive(index) {
    if (!currentOptions.length) return;
    activeIndex = Math.max(0, Math.min(currentOptions.length - 1, index));
    syncAria();
    if (open) optionNodes[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function stopWatching() {
    document.removeEventListener('mousedown', onOutside);
    document.removeEventListener('touchstart', onOutside);
    window.removeEventListener('resize', position);
    window.removeEventListener('scroll', position, true);
  }

  function close(resetActive = true) {
    if (!open) return;
    open = false;
    root.dataset.open = 'false';
    trigger.setAttribute('aria-expanded', 'false');
    menu.dataset.positioned = 'false';
    menu.style.visibility = 'hidden';
    if (resetActive) activeIndex = Math.max(0, selectedIndex());
    syncAria();
    stopWatching();
    window.clearTimeout(typeaheadTimer);
    typeahead = '';
  }

  function onOutside(event) {
    if (!root.contains(event.target) && !menu.contains(event.target)) close();
  }

  function openMenu(index = selectedIndex(), preserveTypeahead = false) {
    if (destroyed || open || trigger.disabled || !currentOptions.length || !dom.isConnected(trigger)) return;
    if (!preserveTypeahead) {
      window.clearTimeout(typeaheadTimer);
      typeahead = '';
    }
    open = true;
    root.dataset.open = 'true';
    trigger.setAttribute('aria-expanded', 'true');
    activeIndex = Math.max(0, index < 0 ? 0 : index);
    syncAria();
    document.addEventListener('mousedown', onOutside);
    document.addEventListener('touchstart', onOutside, { passive: true });
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    position();
  }

  function choose(index) {
    const option = currentOptions[index];
    if (!option) return;
    selectedValue = option.value;
    close(false);
    syncAria();
    onSelect(option);
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
    if (key === 'Tab') {
      if (open) choose(activeIndex);
      else close();
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
      close();
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
    managedAttributes.forEach((name) => setAttribute(trigger, name, originalAttributes.get(name)));
    setAttribute(trigger, 'title', originalTitle);
    setAttribute(root, 'data-open', originalRootOpen);
    window.clearTimeout(typeaheadTimer);
  }

  update(options, selectedValue);
  return { close, destroy, update };
}
