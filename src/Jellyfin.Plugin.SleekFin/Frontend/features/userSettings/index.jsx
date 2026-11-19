import { dom, h, render } from '../../shared/runtime.js';
import { UserSettingsModal } from './UserSettingsModal.jsx';
import { mount as mountPreview } from './preview.js';

const SETTINGS_EVENT = 'sleekfin:user-settings-changed';
const EVENTS = ['hashchange', 'pageshow', 'popstate'];
const LINK_SELECTOR = '[data-sleekfin-user-settings-link]';

function currentScope() {
  const client = window.ApiClient;
  const userId = client?.getCurrentUserId?.();
  const route = window.location.hash.slice(1).replace(/^!/, '').split('?')[0].toLowerCase();
  if (!userId || /^\/(?:login|selectserver|addserver|forgotpassword|wizard)/.test(route)) return '';
  return `${client.serverId?.() || client.serverAddress?.() || ''}:${userId}`;
}

function createUserSettingsFeature() {
  const root = document.documentElement;
  const baseAccent = root.style.getPropertyValue('--sleekfin-accent');
  const baseDropdown = root.dataset.sleekfinDropdownStyle;
  const state = { started: false, scope: '', snapshot: null, signature: '', request: 0, pending: null, timer: 0, observer: null, dialog: null, opening: false };

  function notify() {
    ['header', 'hero', 'details'].forEach((feature) => window.dispatchEvent(new CustomEvent(`sleekfin:${feature}-settings-changed`)));
  }

  function accept(snapshot) {
    if (state.dialog && (!snapshot.enabled || JSON.stringify(state.snapshot?.fields) !== JSON.stringify(snapshot.fields))) close();
    const signature = JSON.stringify([snapshot.fields, { ...snapshot.defaults, ...snapshot.overrides }, snapshot.appearance]);
    state.snapshot = snapshot;
    root.style.setProperty('--sleekfin-accent', snapshot.appearance.accentColor);
    root.dataset.sleekfinDropdownStyle = snapshot.appearance.dropdownStyle;
    if (signature !== state.signature) {
      state.signature = signature;
      notify();
    }
    injectLinks();
  }

  function restoreAppearance() {
    if (baseAccent) root.style.setProperty('--sleekfin-accent', baseAccent);
    else root.style.removeProperty('--sleekfin-accent');
    if (baseDropdown === undefined) delete root.dataset.sleekfinDropdownStyle;
    else root.dataset.sleekfinDropdownStyle = baseDropdown;
  }

  function close() {
    if (state.dialog) window.Dashboard.dialogHelper.close(state.dialog);
  }

  function requestSettings() {
    const scope = currentScope();
    if (!state.started || !scope) return Promise.resolve(null);
    if (state.pending?.scope === scope) return state.pending.promise;
    const request = ++state.request;
    const client = window.ApiClient;
    const pending = { scope, promise: null };
    pending.promise = client.ajax({ type: 'GET', dataType: 'json', url: client.getUrl('SleekFin/UserSettings') }).then((snapshot) => {
      if (!state.started || request !== state.request || scope !== currentScope()) return null;
      accept(snapshot);
      return snapshot;
    }).finally(() => {
      if (state.pending === pending) state.pending = null;
    });
    state.pending = pending;
    return pending.promise;
  }

  async function open(trigger) {
    const helper = window.Dashboard?.dialogHelper;
    if (!helper || state.dialog || state.opening) return;
    state.opening = true;
    const scope = currentScope();
    try {
      const snapshot = await requestSettings();
      if (!snapshot?.enabled || scope !== currentScope() || !state.started) return;
      const dialog = helper.createDialog({ removeOnClose: true, scrollY: false, enableHistory: false, exitAnimation: 'none' });
      dialog.classList.add('sleekfin-user-settings-dialog');
      state.dialog = dialog;
      dialog.addEventListener('close', () => {
        render(null, dialog);
        if (state.dialog === dialog) state.dialog = null;
        if (dom.isVisible(trigger) && window.getComputedStyle(trigger).opacity !== '0') trigger.focus({ preventScroll: true });
      }, { once: true });
      render(h(UserSettingsModal, { snapshot, onClose: close, onSave: async (overrides) => {
        if (scope !== currentScope()) throw new Error('The signed-in user changed.');
        const client = window.ApiClient;
        const saved = await client.ajax({ type: 'PUT', dataType: 'json', contentType: 'application/json', url: client.getUrl('SleekFin/UserSettings'), data: JSON.stringify({ overrides }) });
        if (state.started && scope === currentScope()) {
          state.request += 1;
          state.pending = null;
          accept(saved);
        }
      } }), dialog);
      helper.open(dialog);
    } catch {
      if (state.dialog && !state.dialog.isConnected) {
        render(null, state.dialog);
        state.dialog = null;
      }
      if (scope === currentScope() && state.started) window.Dashboard?.alert('SleekFin could not load your settings. Try again.');
    } finally {
      state.opening = false;
    }
  }

  function bindLink(reference, legacy) {
    const host = legacy ? reference.closest('.verticalSection') : reference.closest('#app-user-menu');
    if (host.querySelector(LINK_SELECTOR)) return;
    const link = reference.cloneNode(true);
    link.setAttribute('data-sleekfin-user-settings-link', 'true');
    link.href = '#';
    const icon = link.querySelector('svg, .material-icons');
    if (icon) icon.replaceWith(dom.element(`<span class="material-icons${legacy ? ' listItemIcon listItemIcon-transparent' : ''}" aria-hidden="true">tune</span>`));
    const text = link.querySelector('.MuiListItemText-primary, .listItemBodyText');
    if (text) text.textContent = 'SleekFin';
    link.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const trigger = document.querySelector('[data-sleekfin-header-proxy-item="jellyfin:user-menu"]') || reference;
      if (!legacy) host.querySelector(':scope > .MuiBackdrop-root')?.click();
      open(trigger);
    });
    reference.insertAdjacentElement('afterend', link);
  }

  function injectLinks() {
    if (!state.snapshot?.enabled || state.scope !== currentScope()) {
      document.querySelectorAll(LINK_SELECTOR).forEach((link) => link.remove());
      return;
    }
    const modern = document.querySelector('#app-user-menu a[href="#/mypreferencesmenu"]');
    if (modern) bindLink(modern, false);
    const legacy = document.querySelector('#myPreferencesMenuPage:not(.hide) .verticalSection a.listItem-border');
    if (legacy) bindLink(legacy, true);
  }

  function reconcile(refreshSettings = false) {
    if (!state.started) return;
    const scope = currentScope();
    if (scope !== state.scope) {
      state.scope = scope;
      state.signature = '';
      state.snapshot = null;
      state.request += 1;
      state.pending = null;
      close();
      restoreAppearance();
      notify();
    }
    if (scope && !state.pending && (refreshSettings || !state.snapshot)) requestSettings().catch(() => console.warn('[SleekFin] User settings could not be loaded.'));
    injectLinks();
  }

  function schedule() {
    if (!state.started || state.timer) return;
    state.timer = window.setTimeout(() => { state.timer = 0; reconcile(); }, 40);
  }

  function refresh() {
    reconcile(true);
  }

  function start() {
    if (state.started || !document.body) return;
    state.started = true;
    EVENTS.forEach((event) => window.addEventListener(event, schedule));
    document.addEventListener('viewshow', schedule);
    window.addEventListener('focus', refresh);
    window.addEventListener(SETTINGS_EVENT, refresh);
    state.observer = new MutationObserver((changes) => {
      if (changes.some((change) => change.target.closest?.('#app-user-menu, #myPreferencesMenuPage') || [...change.addedNodes].some((node) => node.nodeType === 1 && (node.matches('#app-user-menu, #myPreferencesMenuPage') || node.querySelector('#app-user-menu, #myPreferencesMenuPage'))))) schedule();
    });
    state.observer.observe(document.body, { childList: true, subtree: true });
    reconcile();
  }

  function stop() {
    state.started = false;
    state.request += 1;
    window.clearTimeout(state.timer);
    state.timer = 0;
    state.observer?.disconnect();
    EVENTS.forEach((event) => window.removeEventListener(event, schedule));
    document.removeEventListener('viewshow', schedule);
    window.removeEventListener('focus', refresh);
    window.removeEventListener(SETTINGS_EVENT, refresh);
    close();
    document.querySelectorAll(LINK_SELECTOR).forEach((link) => link.remove());
    restoreAppearance();
  }

  return { start, stop };
}

const features = (window.SleekFinFeatures = window.SleekFinFeatures || {});
features.userSettings?.stop?.();
features.userSettings = createUserSettingsFeature();
features.userSettings.start();

window.SleekFin = window.SleekFin || {};
window.SleekFin.userModalPreview = { mount: mountPreview };
