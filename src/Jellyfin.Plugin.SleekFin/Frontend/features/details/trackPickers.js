import { dom } from '../../shared/runtime.js';

const FIELDS = ['selectSource', 'selectVideo', 'selectAudio', 'selectSubtitles'];

// Jellyfin builds each media source's option label on the server, so the label alone is the only
// thing that can identify the track. Matching on it would break on a server running a different
// language, so the comparison is on the option value, which is the stream index.
function signatureFor(select) {
  return Array.from(select.options)
    .map((option) => `${option.value}\u0000${option.text}\u0000${option.selected ? 1 : 0}`)
    .join('\u0001');
}

// Every option is rendered verbatim. The list is Jellyfin's own text, never merged, renamed or
// dropped, so the track the user picks is the one the server offered.
function optionRows(select, menu) {
  const rows = [];
  menu.textContent = '';
  Array.from(select.options).forEach((option) => {
    const row = document.createElement('div');
    row.className = 'sleekfin-details-track-option';
    row.dataset.value = option.value;
    row.setAttribute('role', 'option');
    if (option.selected) row.dataset.selected = 'true';

    const label = document.createElement('span');
    label.className = 'sleekfin-details-track-option-label';
    label.textContent = option.text;

    row.appendChild(label);
    menu.appendChild(row);
    rows.push(row);
  });
  return rows;
}

// The menu lives on document.body: the panel sits inside the hero's stacking context and inside the
// scrolling page, so a list rendered in place would be clipped by both.
// The open and close handlers are passed in rather than captured by name: this function is built at
// module scope, where bare `open` and `close` resolve to window.open and window.close, and a minified
// build renames the factory's own functions so a captured name would silently bind to those globals.
function createPicker(select, label, actions) {
  const root = document.createElement('div');
  root.className = 'sleekfin-details-track';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sleekfin-details-track-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const labelNode = document.createElement('span');
  labelNode.className = 'sleekfin-details-track-label';
  labelNode.textContent = label;

  const valueNode = document.createElement('span');
  valueNode.className = 'sleekfin-details-track-value';

  const chevron = document.createElement('span');
  chevron.className = 'sleekfin-details-track-chevron';

  trigger.append(labelNode, valueNode, chevron);
  root.appendChild(trigger);

  const layer = document.createElement('div');
  layer.className = 'sleekfin-details-track-layer';

  const menu = document.createElement('div');
  menu.className = 'sleekfin-details-track-menu sleekfin-control-3d';
  menu.setAttribute('role', 'listbox');
  menu.dataset.positioned = 'false';
  layer.appendChild(menu);
  document.body.appendChild(layer);

  select.classList.add('sleekfin-details-track-native');
  const picker = {
    activeIndex: 0,
    layer,
    menu,
    open: false,
    root,
    rows: [],
    select,
    signature: '',
    trigger,
    valueNode,
  };

  // Bound once with the picker rather than with the option list, because the list is rebuilt whenever
  // Jellyfin replaces the options and a listener on it would be dropped. This has to come after the
  // object above: these closures capture it, and binding them earlier leaves them in its dead zone,
  // where every click throws instead of opening the list.
  trigger.addEventListener('click', () => {
    if (picker.open) actions.close(picker);
    else actions.open(picker);
  });
  trigger.addEventListener('keydown', (event) => actions.keydown(picker, event));

  return picker;
}

export function createTrackPickers(page) {
  const pickers = new Map();
  const root = page.querySelector('form.trackSelections');
  let destroyed = false;
  let observer = null;
  let place = null;
  let timer = 0;

  function close(picker) {
    if (!picker.open) return;
    picker.open = false;
    picker.trigger.setAttribute('aria-expanded', 'false');
    delete picker.root.dataset.open;
    picker.menu.dataset.positioned = 'false';
  }

  function closeAll() {
    pickers.forEach(close);
  }

  // One teardown for all three ways a picker ends: its select leaving the page, its select being
  // replaced under it, and the page unmounting. They have to agree, because a path that removes only
  // the menu layer leaves the trigger in the row and the next sync appends a second one beside it.
  function dispose(className) {
    const picker = pickers.get(className);
    if (!picker) return;
    picker.layer.remove();
    picker.root.remove();
    picker.select.classList.remove('sleekfin-details-track-native');
    pickers.delete(className);
  }

  // Kept synchronous with scroll rather than measured once, so the list does not trail the field it
  // belongs to while the page moves. The season picker in this bundle does the same.
  function placeMenu(picker) {
    const triggerRect = picker.trigger.getBoundingClientRect();
    const menuRect = picker.menu.getBoundingClientRect();
    const maxMenuHeight = Math.min(420, window.innerHeight * 0.5);
    const contentHeight = picker.menu.scrollHeight + (picker.menu.offsetHeight - picker.menu.clientHeight);
    const menuHeight = Math.min(contentHeight, maxMenuHeight);
    const spaceBelow = Math.max(0, window.innerHeight - triggerRect.bottom - 8);
    const spaceAbove = Math.max(0, triggerRect.top - 8);
    const placement = menuHeight > spaceBelow && spaceAbove > spaceBelow ? 'above' : 'below';
    const maxHeight = Math.floor(Math.min(maxMenuHeight, placement === 'above' ? spaceAbove : spaceBelow));
    const width = Math.max(triggerRect.width, menuRect.width);
    const left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - width - 8));
    const visibleHeight = Math.min(menuHeight, maxHeight);
    const top = placement === 'above' ? Math.max(8, triggerRect.top - visibleHeight - 6) : triggerRect.bottom + 6;

    picker.menu.dataset.placement = placement;
    picker.menu.style.left = `${left}px`;
    picker.menu.style.maxHeight = `${maxHeight}px`;
    picker.menu.style.minWidth = `${Math.round(triggerRect.width)}px`;
    picker.menu.style.top = `${top}px`;
    picker.menu.dataset.positioned = 'true';
  }

  function highlight(picker, index) {
    const count = picker.rows.length;
    if (!count) return;
    picker.activeIndex = Math.max(0, Math.min(count - 1, index));
    picker.rows.forEach((row, position) => {
      row.dataset.active = position === picker.activeIndex ? 'true' : 'false';
    });
    picker.rows[picker.activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function open(picker) {
    if (picker.open || picker.rows.length < 2) return;
    closeAll();
    picker.open = true;
    picker.trigger.setAttribute('aria-expanded', 'true');
    picker.root.dataset.open = 'true';
    const selected = picker.rows.findIndex((row) => row.dataset.selected === 'true');
    highlight(picker, selected < 0 ? 0 : selected);
    placeMenu(picker);
    if (!place) {
      place = () => pickers.forEach((item) => {
        if (item.open) placeMenu(item);
      });
      window.addEventListener('resize', place);
      window.addEventListener('scroll', place, true);
    }
  }

  // The native select stays in the document and keeps carrying the stream index: Jellyfin reads
  // select.value when it builds the play request, so the picker writes to it rather than replacing it.
  function choose(picker, row) {
    const changed = picker.select.value !== row.dataset.value;
    picker.select.value = row.dataset.value;
    if (changed) picker.select.dispatchEvent(new Event('change', { bubbles: true }));
    close(picker);
    sync();
  }

  function sync() {
    if (destroyed || !dom.isConnected(page)) return;
    FIELDS.forEach((className) => {
      const select = page.querySelector(`form.trackSelections .${className}`);
      let picker = pickers.get(className);
      if (!select) {
        dispose(className);
        return;
      }
      if (picker && picker.select !== select) {
        dispose(className);
        picker = null;
      }
      if (!picker) {
        const container = select.closest('.selectContainer');
        const labelText = container?.querySelector('.selectLabel')?.textContent?.trim() || '';
        picker = createPicker(select, labelText, { close, keydown: onTriggerKeyDown, open });
        pickers.set(className, picker);
        container?.appendChild(picker.root);
      }

      // A hidden field is hidden by Jellyfin, which is what decides an item has no such track.
      const container = select.closest('.selectContainer');
      const hidden = !container || container.classList.contains('hide');
      picker.root.hidden = hidden;
      if (hidden) close(picker);

      // Jellyfin disables the select for every field that offers no choice, and its rule is not the
      // option count: video is always disabled because the play request never reads it, audio is
      // disabled without a second track, subtitles without a track. Asked here rather than derived
      // from the option count, which would offer a list of video tracks whose choice does nothing.
      picker.trigger.disabled = select.disabled;

      const signature = signatureFor(select);
      if (signature === picker.signature) return;
      picker.signature = signature;
      picker.rows = optionRows(select, picker.menu);
      picker.rows.forEach((row, index) => {
        row.addEventListener('click', () => choose(picker, row));
        row.addEventListener('mousemove', () => highlight(picker, index));
      });
      const current = select.options[select.selectedIndex];
      picker.valueNode.textContent = current ? current.text : '';
      picker.trigger.title = current ? current.text : '';
      if (picker.open) {
        if (picker.rows.length < 2) close(picker);
        else placeMenu(picker);
      }
    });
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(sync, 60);
  }

  function onDocumentPointer(event) {
    pickers.forEach((picker) => {
      if (!picker.open) return;
      if (!picker.root.contains(event.target) && !picker.menu.contains(event.target)) close(picker);
    });
  }

  // Handled on the trigger alone, which is the only focusable part of the picker because the list
  // never takes focus. Scoping the keys here is what stops them the moment the user tabs away: a
  // document-level handler keeps consuming arrows and Enter for a list that is still open but is no
  // longer the thing the user is operating, and would commit a track from another control.
  function onTriggerKeyDown(picker, event) {
    if (event.key === 'Escape') {
      if (!picker.open) return;
      event.preventDefault();
      close(picker);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (picker.open) highlight(picker, picker.activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
      else open(picker);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!picker.open) {
        open(picker);
        return;
      }
      const row = picker.rows[picker.activeIndex];
      if (row) choose(picker, row);
    }
  }

  // Jellyfin rebuilds this form's contents whenever the selected media source changes, replacing the
  // options under a select it reuses and sometimes the select itself. Setup therefore cannot be a
  // one-shot: the observer re-runs the same idempotent sync that mounting does.
  function watch() {
    if (!root || observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    document.addEventListener('mousedown', onDocumentPointer);
    document.addEventListener('touchstart', onDocumentPointer);
  }

  function unwatch() {
    observer?.disconnect();
    observer = null;
    document.removeEventListener('mousedown', onDocumentPointer);
    document.removeEventListener('touchstart', onDocumentPointer);
    if (place) {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      place = null;
    }
    window.clearTimeout(timer);
  }

  sync();
  watch();

  return {
    destroy() {
      destroyed = true;
      unwatch();
      closeAll();
      Array.from(pickers.keys()).forEach(dispose);
    },
    reconcile() {
      if (destroyed) return;
      watch();
      sync();
    },
  };
}
