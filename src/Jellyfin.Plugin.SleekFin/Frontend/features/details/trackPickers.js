import { dom } from '../../shared/runtime.js';
import { createDropdown } from './dropdown.js';

const FIELDS = { selectSource: 'showVersionPicker', selectVideo: 'showVideoDetails', selectAudio: 'showAudioPicker', selectSubtitles: 'showSubtitlePicker' };

export function createTrackPickers(page, actions, initialSettings, loadSettings, onSourceChange) {
  const form = page.querySelector('form.trackSelections');
  const metadataNodes = Array.from(page.querySelectorAll('.detailSectionContent, .itemDetailsGroup'));
  if (!form && !metadataNodes.length) return { reconcile() {}, update() {}, open() {}, destroy() {} };
  const button = dom.element('<button is="emby-button" type="button" class="button-flat detailButton sleekfin-details-track-settings" title="Info"><span class="material-icons info_outline"></span></button>');
  actions.appendChild(button);
  window.CustomElements?.upgradeSubtree(actions);
  let dialog = null;
  let fields = [];
  let metadata = [];
  let sourceId = '';
  let destroyed = false;
  let timer = 0;
  let settings = initialSettings;

  function destroyFields() {
    fields.forEach(({ dropdown }) => dropdown?.destroy());
    fields = [];
  }

  function restoreMetadata(dlg) {
    metadata.reverse().forEach(({ element, parent, next }) => {
      if (!dlg.contains(element)) return;
      if (page.contains(parent)) parent.insertBefore(element, next?.parentNode === parent ? next : null);
      else element.remove();
    });
    metadata = [];
  }

  async function open(trigger = button) {
    const helper = window.Dashboard?.dialogHelper;
    if (destroyed || dialog || button.disabled || button.hidden || !helper || !dom.isVisible(trigger)) return;
    button.disabled = true;
    const previousSettings = settings;
    const loadedSettings = await loadSettings();
    if (settings === previousSettings) settings = loadedSettings;
    button.disabled = false;
    if (destroyed || button.hidden || !dom.isVisible(trigger)) return;
    const tv = document.documentElement.classList.contains('layout-tv');
    // Jellyfin's TV select handles webOS and Xbox menus through its remote navigation.
    const style = settings.dropdownStyle === 'Native' && tv ? 'Jellyfin' : settings.dropdownStyle;
    // No modal history entry: navigation already destroys this page's Info dialog.
    // A hidden or detached owning page cannot emit the exit animation's completion event.
    const dlg = helper.createDialog({ removeOnClose: true, scrollY: false, enableHistory: false, exitAnimation: 'none' });
    dialog = dlg;
    dlg.id = `sleekfin-details-tracks-${Date.now()}`;
    dlg.classList.add('sleekfin-details-track-dialog', 'sleekfin-control-3d');
    dlg.innerHTML = '<div class="sleekfin-details-track-header"><h3>Info</h3><button type="button" class="sleekfin-details-track-close sleekfin-icon-button" title="Close"><span class="material-icons close"></span></button></div><div class="sleekfin-details-track-content smoothScrollY"><hr class="sleekfin-details-info-divider"><div class="sleekfin-details-info-metadata"></div></div>';
    dlg.querySelector('.sleekfin-details-track-close').addEventListener('click', () => helper.close(dlg));
    dlg.addEventListener('closing', () => {
      fields.forEach(({ dropdown }) => dropdown?.close());
      restoreMetadata(dlg);
    });

    dlg.addEventListener('close', () => {
      destroyFields();
      if (dialog === dlg) dialog = null;
    });
    if (tv) trigger.focus();
    helper.open(dlg);
    dlg.backdrop.classList.add('sleekfin-details-info-backdrop');
    dlg.dialogContainer.classList.add('sleekfin-details-info-container');

    // Native and JE updates still resolve their metadata through the owning page.
    page.appendChild(dlg.backdrop);
    page.appendChild(dlg.dialogContainer);
    const content = dlg.querySelector('.sleekfin-details-track-content');
    const divider = content.querySelector('.sleekfin-details-info-divider');
    const metadataRoot = content.querySelector('.sleekfin-details-info-metadata');
    // Keep native and JE link handlers, metadata render roots, and late streaming results.
    metadata = metadataNodes.filter((element) => page.contains(element)).map((element) => {
      const record = { element, parent: element.parentNode, next: element.nextSibling };
      metadataRoot.appendChild(element);
      return record;
    });
    
    fields = Object.keys(FIELDS).map((className) => {
      const select = form?.querySelector(`.${className}`);
      const container = select?.closest('.selectContainer');
      if (!container) return null;
      const field = dom.element('<div class="selectContainer"><label class="selectLabel"></label></div>');
      const nativeLabel = field.firstElementChild;
      // Jellyfin's playback and version handlers still query the original selectors in the page.
      const control = style === 'Native' ? document.createElement('select') : select.cloneNode(true);
      if (style === 'Native') control.className = 'sleekfin-details-basic-native';
      control.id = `${dlg.id}-${className}`;
      control.classList.remove('detailTrackSelect');
      nativeLabel.htmlFor = control.id;
      field.appendChild(control);
      const arrow = container.querySelector('.selectArrowContainer');
      if (arrow && style !== 'Native') field.appendChild(arrow.cloneNode(true));
      control.addEventListener('change', () => {
        select.value = control.value;
        // Changing media version refreshes detail content, so close its Info dialog first.
        if (className === 'selectSource') helper.close(dlg);
        select.dispatchEvent(new Event('change', { bubbles: true }));
      });
      let trigger, label, value, dropdown;
      if (style === 'SeerrFin') {
        nativeLabel.classList.add('hide');
        control.classList.add('sleekfin-details-track-native');
        field.classList.add('sleekfin-details-custom-track');
        const root = dom.element('<div class="sleekfin-details-track"><span class="sleekfin-details-track-label"></span><button type="button" class="sleekfin-details-track-trigger"><span class="sleekfin-details-track-value"></span><span class="sleekfin-details-track-chevron"></span></button></div>');
        trigger = root.querySelector('button');
        label = root.querySelector('.sleekfin-details-track-label');
        value = root.querySelector('.sleekfin-details-track-value');
        field.appendChild(root);
        dropdown = createDropdown({ root, trigger, portal: dlg.dialogContainer, onSelect(option) {
          if (select.value === option.value) return;
          control.value = option.value;
          control.dispatchEvent(new Event('change'));
        } });
      }
      content.insertBefore(field, divider);
      return { className, container, control, dropdown, field, label, nativeLabel, select, trigger, value };
    }).filter(Boolean);
    sync();
    // Moving a TV dialog after Jellyfin's synchronous autofocus drops its focused descendant.
    if (tv) dlg.querySelector('.sleekfin-details-track-close').focus();
  }

  function sync() {
    if (destroyed || !dom.isConnected(page)) return;
    page.querySelectorAll('.streaming-lookup-container #streaming-result-container').forEach((result) => {
      result.parentElement.classList.toggle('sleekfin-details-availability-updated', result.childElementCount > 0);
    });
    const hidden = !form || form.classList.contains('hide');
    const hasMetadata = settings.showItemMetadata && metadataNodes.some((element) => element.matches('.itemDetailsGroup') ? element.textContent.trim() : Array.from(element.children).some((child) => !child.matches('.itemExternalLinks, .hide') && child.textContent.trim()));
    const hasExternalLinks = settings.showExternalLinks && metadataNodes.some((element) => element.querySelector('.itemExternalLinks:not(.hide)')?.textContent.trim());
    button.hidden = !hasMetadata && !hasExternalLinks && (hidden || !Object.keys(FIELDS).some((className) => {
      const container = form?.querySelector(`.${className}`)?.closest('.selectContainer');
      return settings[FIELDS[className]] && container && !container.classList.contains('hide');
    }));
    fields.forEach(({ className, container, control, dropdown, field, label, nativeLabel, select, trigger, value }) => {
      field.classList.toggle('hide', !settings[FIELDS[className]] || hidden || container.classList.contains('hide'));
      if (control.innerHTML !== select.innerHTML) control.replaceChildren(...Array.from(select.options, (option) => option.cloneNode(true)));
      control.disabled = select.disabled || select.options.length <= 1;
      control.value = select.value;
      const labelText = container.querySelector('.selectLabel')?.textContent.trim() || '';
      if (nativeLabel.textContent !== labelText) nativeLabel.textContent = labelText;
      if (!dropdown) return;
      trigger.disabled = control.disabled;
      if (label.textContent !== labelText) label.textContent = labelText;
      const valueText = select.options[select.selectedIndex]?.text || '';
      if (value.textContent !== valueText) value.textContent = valueText;
      dropdown.update(Array.from(select.options, (option) => ({ value: option.value, label: option.text })), select.value);
    });
    dialog?.querySelector('.sleekfin-details-info-divider')?.classList.toggle('hide', !(hasMetadata || hasExternalLinks) || !fields.some(({ field }) => !field.classList.contains('hide')));
    if (button.hidden && dialog) window.Dashboard.dialogHelper.close(dialog);
    const selectedSource = form?.querySelector('.selectSource')?.value || '';
    if (selectedSource !== sourceId) {
      sourceId = selectedSource;
      if (sourceId) onSourceChange?.(sourceId);
    }
  }

  const observer = new MutationObserver(() => {
    window.clearTimeout(timer);
    timer = window.setTimeout(sync, 60);
  });
  if (form) observer.observe(form, { attributes: true, attributeFilter: ['class', 'disabled'], childList: true, subtree: true });
  metadataNodes.forEach((element) => observer.observe(element, { childList: true, subtree: true }));
  function refreshAvailability(event) {
    if (!event.target.closest?.('#streaming-settings-modal #save-settings') || destroyed || !dom.isVisible(page)) return;
    // JE's target handler updates its private search options before this bubbling listener.
    page.querySelector('.streaming-lookup-container .elsewhere-search-button')?.click();
  }
  document.addEventListener('click', refreshAvailability);
  form?.addEventListener('change', sync);
  const onClick = () => open();
  button.addEventListener('click', onClick);
  sync();

  return {
    reconcile: sync,
    open,
    update(nextSettings) {
      if (dialog && settings.dropdownStyle !== nextSettings.dropdownStyle) window.Dashboard.dialogHelper.close(dialog);
      settings = nextSettings;
      sync();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer.disconnect();
      window.clearTimeout(timer);
      form?.removeEventListener('change', sync);
      document.removeEventListener('click', refreshAvailability);
      button.removeEventListener('click', onClick);
      button.remove();
      destroyFields();
      if (dialog) {
        restoreMetadata(dialog);
        window.Dashboard.dialogHelper.close(dialog);
      }
    },
  };
}
