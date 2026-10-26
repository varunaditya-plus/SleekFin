import { applyActionSettings } from '../details/actions.js';

export function createPreviewOverflow(groups, { initialOpen = false } = {}) {
  const zones = [...groups.children].filter((zone) => ['left', 'right'].includes(zone.dataset.sleekfinDetailsDrop));
  const originals = zones.flatMap((source) => [...source.children].filter((button) => button.hasAttribute('data-sleekfin-action-id')).map((button, index) => ({ button, source, index })));
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sleekfin-icon-button sleekfin-control-3d sleekfin-details-action-control sleekfin-details-action-overflow-trigger sleekfin-details-builder-overflow-toggle';
  trigger.title = 'More actions';
  trigger.innerHTML = '<span class="material-icons more_vert"></span>';
  trigger.hidden = true;
  zones[1].appendChild(trigger);
  const popover = document.createElement('div');
  popover.className = 'sleekfin-details-builder-overflow';
  popover.hidden = true;
  zones.forEach((zone) => {
    const target = document.createElement('div');
    target.className = 'mainDetailButtons sleekfin-details-actions sleekfin-details-builder-drop-zone';
    target.dataset.sleekfinDetailsDrop = zone.dataset.sleekfinDetailsDrop;
    popover.appendChild(target);
  });
  groups.appendChild(popover);
  let open = Boolean(initialOpen);
  let settings = null;
  let mobile = false;
  let width = -1;
  let frame = 0;
  let destroyed = false;
  let restoreAppearance = [];
  const originalGap = groups.style.gap;

  function markEmptySides() {
    const left = [...zones[0].children].some((button) => button.hasAttribute('data-sleekfin-action-id'));
    const right = !trigger.hidden || [...zones[1].children].some((button) => button.hasAttribute('data-sleekfin-action-id'));
    groups.dataset.sleekfinEmptySide = left ? right ? '' : 'right' : right ? 'left' : 'both';
    groups.style.gap = left && right ? originalGap : '0px';
  }

  function restoreButtons() {
    originals.forEach(({ button, source, index }) => {
      if (!popover.contains(button)) return;
      source.insertBefore(button, source.children[index] || (source === zones[1] ? trigger : null));
    });
  }

  function setOpen(value) {
    open = Boolean(value && !trigger.hidden);
    popover.hidden = !open;
  }

  function layout(force = false) {
    frame = 0;
    if (destroyed || !settings || !groups.isConnected || !groups.getClientRects().length) return;
    const nextWidth = groups.clientWidth;
    if (!nextWidth || !force && width === nextWidth) return;
    width = nextWidth;
    restoreButtons();
    trigger.hidden = true;
    if (settings.buttonOverflow !== 'More') { setOpen(false); markEmptySides(); return; }
    const previous = zones.map((zone) => ({ flex: zone.style.flex, width: zone.style.width }));
    zones.forEach((zone) => { zone.style.flex = '0 0 auto'; zone.style.width = 'max-content'; });
    const widths = new Map(originals.map(({ button }) => [button, button.getBoundingClientRect().width]));
    const gap = settings.buttonSpacing;
    const groupGap = settings.buttonGroupSpacing === 'Auto' ? gap : settings.buttonGroupSpacing;
    const stack = mobile && settings.mobileActionGroups === 'Stack';
    const rows = zones.map((zone) => originals.filter((record) => record.source === zone));
    const displaced = new Set();
    const triggerWidth = mobile ? settings.mobileButtonHeight : settings.desktopButtonHeight;
    const rowWidth = (items, extra = false) => items.reduce((sum, { button }) => sum + widths.get(button), extra ? triggerWidth : 0) + Math.max(0, items.length + Number(extra) - 1) * gap;
    const removeTail = (items, fits) => {
      for (let index = items.length - 1; index >= 0 && !fits(); index--) {
        const record = items[index];
        if (record.button.dataset.sleekfinActionId === 'more') continue;
        displaced.add(record);
        items.splice(index, 1);
      }
    };
    if (stack) {
      removeTail(rows[0], () => rowWidth(rows[0]) <= width);
      if (displaced.size || rowWidth(rows[1]) > width) removeTail(rows[1], () => rowWidth(rows[1], true) <= width);
    } else {
      const remaining = [...originals];
      const fits = (extra) => {
        const left = remaining.filter((record) => record.source === zones[0]);
        const right = remaining.filter((record) => record.source === zones[1]);
        return rowWidth(left) + rowWidth(right, extra) + (left.length && (right.length || extra) ? groupGap : 0) <= width;
      };
      if (!fits(false)) removeTail(remaining, () => fits(true));
    }
    zones.forEach((zone, index) => {
      zone.style.flex = previous[index].flex;
      zone.style.width = previous[index].width;
    });
    originals.filter((record) => displaced.has(record)).forEach(({ button, source }) => popover.children[zones.indexOf(source)].appendChild(button));
    trigger.hidden = displaced.size === 0;
    markEmptySides();
    setOpen(open);
  }

  function queue() {
    if (!destroyed && !frame) frame = requestAnimationFrame(() => layout());
  }

  function toggle(event) { event.preventDefault(); setOpen(!open); }
  function outside(event) {
    if (event.target.closest('[data-sleekfin-action-id]') && groups.closest('.sleekfin-details-builder')?.contains(event.target)) return;
    if (!groups.contains(event.target)) setOpen(false);
  }
  function keyDown(event) { if (event.key === 'Escape') setOpen(false); }
  trigger.addEventListener('click', toggle);
  document.addEventListener('pointerdown', outside);
  document.addEventListener('keydown', keyDown);
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(queue) : null;
  observer?.observe(groups);
  window.addEventListener('resize', queue);

  return {
    get openState() { return open; },
    update(values, options = {}) {
      settings = values;
      mobile = options.mobile === true;
      restoreAppearance.forEach((restore) => restore());
      restoreAppearance = [...popover.children].map((zone) => applyActionSettings(zone, settings, { mobile }));
      layout(true);
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', queue);
      trigger.removeEventListener('click', toggle);
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keyDown);
      restoreButtons();
      restoreAppearance.forEach((restore) => restore());
      trigger.remove();
      popover.remove();
      groups.style.gap = originalGap;
      delete groups.dataset.sleekfinEmptySide;
    },
  };
}
