import { h, useEffect, useRef, useState } from '../../shared/runtime.js';

function toggleOnEnter(event) {
  // Jellyfin's checkbox uses Enter to toggle instead of submitting the form.
  if (event.key !== 'Enter') return;
  event.preventDefault();
  event.currentTarget.click();
}

function ToggleInput({ id, checked, disabled, onChange }) {
  return <label class="sleekfin-toggle"><input id={id} type="checkbox" checked={checked} disabled={disabled} onKeyDown={toggleOnEnter} onChange={(event) => onChange(event.currentTarget.checked)} /><span class="sleekfin-toggle-slider" /></label>;
}

function SettingInput({ field, value, disabled, onChange }) {
  const id = `sleekfin-user-${field.id}`;
  if (field.type === 'boolean') return <ToggleInput id={id} checked={value === true} disabled={disabled} onChange={onChange} />;
  if (field.type === 'select') return <select id={id} class="sleekfin-input" value={value} disabled={disabled} onChange={(event) => onChange(event.currentTarget.value)}>{field.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>;
  if (field.type === 'sources') {
    const selected = String(value || '').split(',').filter(Boolean);
    return <div class="sleekfin-user-sources">{field.options.map((option) => <div class="sleekfin-user-source" key={option.value}><label for={`${id}-${option.value}`}>{option.label}</label><ToggleInput id={`${id}-${option.value}`} checked={selected.includes(option.value)} disabled={disabled} onChange={(checked) => onChange((checked ? [...selected, option.value] : selected.filter((source) => source !== option.value)).join(','))} /></div>)}</div>;
  }
  if (field.type === 'color') return <label class="sleekfin-color-swatch"><input id={id} type="color" value={value} disabled={disabled} onInput={(event) => onChange(event.currentTarget.value)} /></label>;
  return <div class="sleekfin-input sleekfin-hero-number-field"><input id={id} type="number" value={value} min={field.min} max={field.max} required disabled={disabled} onInput={(event) => onChange(event.currentTarget.value)} /></div>;
}

export function UserSettingsModal({ snapshot, onSave, onClose }) {
  const [overrides, setOverrides] = useState(snapshot.overrides);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const values = { ...snapshot.defaults, ...overrides };
  const groups = [...new Set(snapshot.fields.map((field) => field.group))];
  const dirty = snapshot.fields.some(({ id }) => String(overrides[id]) !== String(snapshot.overrides[id]));

  function change(field, value) {
    setError('');
    setOverrides((previous) => {
      const next = { ...previous };
      if (String(value) === String(snapshot.defaults[field.id])) delete next[field.id];
      else next[field.id] = value;
      return next;
    });
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    if (snapshot.fields.some((field) => field.type === 'sources' && !String(values[field.id] || '').trim())) {
      setError('Select at least one hero content source.');
      return;
    }
    const request = { ...overrides };
    snapshot.fields.filter((field) => field.type === 'number' && Object.prototype.hasOwnProperty.call(request, field.id)).forEach((field) => { request[field.id] = Number(request[field.id]); });
    setBusy(true);
    setError('');
    try {
      await onSave(request);
      if (mounted.current) onClose();
    } catch {
      if (mounted.current) setError('Your settings could not be saved. Try again.');
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return <form class="formDialog sleekfin-user-settings-form" onSubmit={save}>
    <div class="formDialogHeader"><h3 class="formDialogHeaderTitle">SleekFin</h3><button type="button" class="paper-icon-button-light" title="Close" disabled={busy} onClick={onClose}><span class="material-icons close" /></button></div>
    <div class="sleekfin-user-settings-content smoothScrollY">
      {groups.map((group) => <section class="sleekfin-user-settings-section" key={group}>
        <h4>{group}</h4>
        {snapshot.fields.filter((field) => field.group === group).map((field) => <div class="sleekfin-user-setting" key={field.id}>
          {field.type === 'sources' ? <span class="sleekfin-user-setting-label">{field.label}</span> : <label class="sleekfin-user-setting-label" for={`sleekfin-user-${field.id}`}>{field.label}</label>}
          <SettingInput field={field} value={values[field.id]} disabled={busy} onChange={(value) => change(field, value)} />
        </div>)}
      </section>)}
      {error ? <p class="sleekfin-user-settings-error">{error}</p> : null}
    </div>
    <div class="formDialogFooter formDialogFooter-flex"><button type="button" class="emby-button button-flat" disabled={busy || !Object.keys(overrides).length} onClick={() => { setOverrides({}); setError(''); }}>Reset to server defaults</button><div><button type="button" class="emby-button button-flat" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" class="emby-button raised button-submit" disabled={busy || !dirty}>{busy ? 'Saving…' : 'Save'}</button></div></div>
  </form>;
}
