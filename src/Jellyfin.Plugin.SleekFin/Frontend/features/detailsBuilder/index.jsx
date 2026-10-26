import { h, render, dom } from '../../shared/runtime.js';
import { DEFAULT_SETTINGS, normalizeSettings, readConfiguration, writeConfiguration } from '../details/settings.js';
import { getActionCatalog, createActionPreview, setProviderAvailability } from '../details/actionCatalog.js';
import { applyActionSettings } from '../details/actions.js';
import { SettingsFields, validateFields } from './fields.jsx';
import { createPreview } from './preview.js';
import { createActionDrag } from './drag.js';
import { createPreviewOverflow } from './overflow.js';

function mount(root, { onSharedChange } = {}) {
  if (root.sleekfinDetailsBuilder) return root.sleekfinDetailsBuilder;
  root.classList.add('sleekfin-details-builder');
  root.innerHTML = '<div class="sleekfin-details-builder-editor"><div class="sleekfin-details-builder-preview"><div class="sleekfin-details-builder-sample"></div><div class="sleekfin-details-builder-selectors"><select class="sleekfin-select" aria-label="Preview media type"><option>Movie</option><option>Series</option><option>Season</option><option>Episode</option></select><select class="sleekfin-select" aria-label="Preview device"><option>Desktop</option><option>Mobile</option></select></div><span class="sleekfin-details-builder-caption">↑ THIS IS A LIVE PREVIEW OF YOUR DETAIL CAROUSEL</span></div><div class="sleekfin-details-builder-content"><p class="sleekfin-details-builder-instruction">Drag buttons into the left or right side</p><div class="mainDetailButtons sleekfin-details-actions sleekfin-details-builder-palette" data-sleekfin-details-drop="palette"></div><div class="sleekfin-details-builder-fields"></div><div class="sleekfin-header-editor-footer"><button type="button" class="sleekfin-builder-config-button" data-sleekfin-config-action="enter" data-sleekfin-config-builder="details">Enter configuration</button><button type="button" class="sleekfin-builder-config-button" data-sleekfin-config-action="view" data-sleekfin-config-builder="details">View configuration</button><button type="button" class="sleekfin-header-reset">Reset detail defaults</button></div></div></div>';
  const sample = root.querySelector('.sleekfin-details-builder-sample');
  const fields = root.querySelector('.sleekfin-details-builder-fields');
  const palette = root.querySelector('.sleekfin-details-builder-palette');
  const selectors = root.querySelectorAll('select');
  const reset = root.querySelector('.sleekfin-header-reset');
  const hiddenInputs = ['leftActions', 'rightActions', 'hiddenActions'].map((key) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.id = `sleekFinDetails${key[0].toUpperCase()}${key.slice(1)}`;
    root.appendChild(input);
    return [key, input];
  });
  let values = readConfiguration({});
  let mediaItem = null;
  let mediaType = 'Movie';
  let mobile = false;
  let active = false;
  let destroyed = false;
  let restoreAppearance = [];
  let overflow = null;
  let drag = null;
  let automaticActions = [];
  const unavailablePlaced = new Set();
  const groups = dom.element('<div class="sleekfin-details-builder-action-groups"><div class="mainDetailButtons sleekfin-details-actions sleekfin-details-builder-drop-zone" data-sleekfin-details-drop="left"></div><div class="mainDetailButtons sleekfin-details-actions sleekfin-details-builder-drop-zone" data-sleekfin-details-drop="right"></div></div>');
  const preview = createPreview(sample, { onItem(item) { mediaItem = item; renderActions(); } });
  preview.actions.appendChild(groups);

  function notify() {
    hiddenInputs.forEach(([key, input]) => { input.value = values[key].join(','); });
    root.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function renderActions() {
    if (destroyed || drag?.cancel()) return;
    const overflowOpen = overflow?.openState;
    overflow?.destroy();
    const settings = normalizeSettings(values);
    const catalog = getActionCatalog(mediaItem || mediaType, [...settings.leftActions, ...settings.rightActions, ...settings.hiddenActions]).map((entry) => entry.id === 'info' ? { ...entry, available: preview.infoAvailable } : entry);
    const assigned = new Set([...settings.leftActions, ...settings.rightActions, ...settings.hiddenActions]);
    const automatic = catalog.filter((entry) => !assigned.has(entry.id) && entry.available).map((entry) => entry.id);
    automaticActions = automatic;
    const visible = (id) => catalog.find((entry) => entry.id === id)?.available || unavailablePlaced.has(id);
    const lists = { left: [...settings.leftActions, ...automatic].filter(visible), right: settings.rightActions.filter(visible) };
    const selected = new Set([...lists.left, ...lists.right]);
    restoreAppearance.forEach((restore) => restore?.());
    restoreAppearance = [];
    const populate = (zone, ids) => {
      zone.replaceChildren();
      ids.forEach((id) => {
        const button = createActionPreview(id, mediaItem || mediaType);
        const entry = catalog.find((entry) => entry.id === id);
        const source = id.startsWith('je:') ? 'JE' : ['Jellyfin', 'Unavailable action'].includes(entry.provider) ? '' : entry.provider;
        const element = dom.element('<div class="sleekfin-details-builder-item"><span class="sleekfin-details-builder-item-caption"></span></div>');
        element.dataset.sleekfinActionId = id;
        element.dataset.sleekfinActionAvailable = button.dataset.sleekfinActionAvailable = String(entry.available);
        element.title = `${source ? `${source} ` : ''}${entry.label}${entry.available ? '' : ' (will not show in detail page)'}`;
        element.firstElementChild.textContent = `${source ? `${source} ` : ''}${entry.label}`;
        button.removeAttribute('data-sleekfin-action-id');
        button.title = element.title;
        element.prepend(button);
        zone.appendChild(element);
      });
      restoreAppearance.push(applyActionSettings(zone, settings, { mobile }));
    };
    populate(groups.children[0], lists.left);
    populate(groups.children[1], lists.right);
    populate(palette, catalog.filter((entry) => !selected.has(entry.id)).map((entry) => entry.id));
    groups.dataset.mobile = String(mobile);
    groups.dataset.layout = settings.mobileActionGroups;
    groups.style.gap = settings.buttonGroupSpacing === 'Auto' ? `${settings.buttonSpacing}px` : `${settings.buttonGroupSpacing}px`;
    groups.style.justifyContent = settings.buttonGroupSpacing === 'Auto' ? 'space-between' : 'flex-start';
    overflow = createPreviewOverflow(groups, { initialOpen: overflowOpen });
    overflow.update(settings, { mobile });
  }

  function renderFields() {
    render(<SettingsFields values={values} onChange={change} />, fields);
  }

  function updatePreview() {
    preview.update(normalizeSettings(values), { mediaType, mobile, active });
    renderActions();
  }

  function change(key, value) {
    values = { ...values, [key]: value };
    renderFields();
    if (key === 'dropdownStyle' || key === 'trailerBackgroundEnabled') onSharedChange?.(key, value);
    updatePreview();
    notify();
  }

  function actionSnapshot() {
    return Object.fromEntries(['leftActions', 'rightActions', 'hiddenActions'].map((key) => [key, [...values[key]]]));
  }

  drag = createActionDrag(root, {
    read: () => ({ actions: actionSnapshot(), unavailable: [...unavailablePlaced] }),
    move(id, target, anchor) {
      if (target === 'palette') unavailablePlaced.delete(id);
      else unavailablePlaced.add(id);
      const next = actionSnapshot();
      if (target === 'left' && (!anchor || automaticActions.includes(anchor))) next.leftActions.push(...automaticActions);
      Object.keys(next).forEach((key) => { next[key] = next[key].filter((entry) => entry !== id); });
      const key = target === 'palette' ? 'hiddenActions' : `${target}Actions`;
      const index = anchor ? next[key].indexOf(anchor) : -1;
      next[key].splice(index < 0 ? next[key].length : index, 0, id);
      if (JSON.stringify(next) === JSON.stringify(actionSnapshot())) {
        renderActions();
        return;
      }
      values = { ...values, ...next };
      renderActions();
      notify();
    },
    restore(snapshot) {
      values = { ...values, ...snapshot.actions };
      unavailablePlaced.clear();
      snapshot.unavailable.forEach((id) => unavailablePlaced.add(id));
      renderActions();
      notify();
    },
  });
  function selectPreview() {
    drag.cancel();
    const nextType = selectors[0].value;
    if (nextType !== mediaType) {
      mediaItem = null;
      unavailablePlaced.clear();
    }
    mediaType = nextType;
    mobile = selectors[1].value === 'Mobile';
    updatePreview();
  }
  function resetDefaults() {
    drag.cancel();
    values = normalizeSettings({ ...DEFAULT_SETTINGS });
    unavailablePlaced.clear();
    onSharedChange?.('dropdownStyle', values.dropdownStyle);
    onSharedChange?.('trailerBackgroundEnabled', values.trailerBackgroundEnabled);
    renderFields();
    updatePreview();
    notify();
  }
  selectors.forEach((select) => select.addEventListener('change', selectPreview));
  reset.addEventListener('click', resetDefaults);
  function previewClick(event) {
    const info = event.target.closest('[data-sleekfin-action-id="info"]');
    if (info && groups.contains(info)) preview.openInfo(info);
  }
  groups.addEventListener('click', previewClick);
  window.addEventListener('sleekfin:details-actions-changed', renderActions);
  const controller = {
    load(configuration) {
      drag.cancel();
      values = readConfiguration(configuration);
      root.style.setProperty('--sleekfin-accent', configuration.AccentColor || '#dc2626');
      unavailablePlaced.clear();
      renderFields();
      updatePreview();
      notify();
    },
    write(configuration) { return writeConfiguration(configuration, values); },
    validate() { return validateFields(fields); },
    setSharedSetting(key, value) { change(key, value); },
    setAccent(value) { root.style.setProperty('--sleekfin-accent', value); renderFields(); updatePreview(); },
    setProviders(value) { setProviderAvailability(value); },
    show() { active = true; fields.querySelectorAll('details').forEach((section) => { section.open = false; }); updatePreview(); },
    hide() { active = false; drag.cancel(); updatePreview(); },
    destroy() {
      destroyed = true;
      drag.destroy();
      overflow?.destroy();
      preview.destroy();
      restoreAppearance.forEach((restore) => restore?.());
      render(null, fields);
      selectors.forEach((select) => select.removeEventListener('change', selectPreview));
      reset.removeEventListener('click', resetDefaults);
      groups.removeEventListener('click', previewClick);
      window.removeEventListener('sleekfin:details-actions-changed', renderActions);
      delete root.sleekfinDetailsBuilder;
      root.replaceChildren();
    },
  };
  root.sleekfinDetailsBuilder = controller;
  renderFields();
  notify();
  return controller;
}

window.SleekFin = window.SleekFin || {};
window.SleekFin.detailsBuilder = { mount };
