import { dom, h, render } from '../../shared/runtime.js';
import { UserSettingsModal } from './UserSettingsModal.jsx';

export function mount(host) {
  host.sleekfinUserModalPreview?.destroy();
  const frame = dom.element('<iframe class="sleekfin-user-modal-preview-frame" title="User modal preview"></iframe>');
  let root = null;
  let snapshot = null;
  let accent = '';

  function paint() {
    if (!root || !snapshot) return;
    frame.contentDocument.documentElement.style.setProperty('--sleekfin-accent', accent);
    root.className = snapshot.enabled ? 'dialog sleekfin-user-settings-dialog' : '';
    render(snapshot.enabled ? h(UserSettingsModal, { snapshot }) : h('p', { class: 'sleekfin-user-settings-intro' }, 'SleekFin is hidden from the profile menu.'), root);
    root.querySelectorAll('input, select, button').forEach((control) => { control.tabIndex = -1; });
  }

  function loaded() {
    if (!frame.isConnected) return;
    const doc = frame.contentDocument;
    doc.documentElement.dir = document.documentElement.dir;
    doc.documentElement.lang = document.documentElement.lang;
    doc.documentElement.dataset.theme = document.documentElement.dataset.theme || 'dark';
    document.querySelectorAll('link[rel="stylesheet"], head style').forEach((source) => {
      if (source.sheet?.disabled) return;
      const style = source.cloneNode(true);
      if (source.tagName === 'LINK') style.href = source.href;
      else style.textContent = Array.from(source.sheet?.cssRules || [], (rule) => rule.cssText).join('\n') || source.textContent;
      doc.head.appendChild(style);
    });
    root = doc.body.firstElementChild;
    paint();
  }

  frame.addEventListener('load', loaded, { once: true });
  frame.srcdoc = '<!doctype html><html class="layout-desktop sleekfin-main-ui"><head><meta charset="utf-8"></head><body class="sleekfin-user-modal-preview"><div></div></body></html>';
  host.replaceChildren(frame);
  const controller = {
    update(fields, configuration) {
      accent = configuration.AccentColor;
      snapshot = { enabled: configuration.UserModalEnabled, fields, defaults: Object.fromEntries(fields.map((field) => [field.id, configuration[field.id]])), overrides: {} };
      paint();
    },
    destroy() {
      frame.removeEventListener('load', loaded);
      if (root) render(null, root);
      frame.remove();
      delete host.sleekfinUserModalPreview;
    },
  };
  host.sleekfinUserModalPreview = controller;
  return controller;
}
