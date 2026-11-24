import { h, useEffect, useRef } from '../../shared/runtime.js';
import { getPopupViewport } from '../../shared/popupPosition.js';
import { cloneSourceTemplate } from './inventory.js';
import { isTvLayout } from './shared.js';

function OverflowItemVisual({ record }) {
  const element = useRef(null);

  useEffect(() => {
    const holder = element.current;
    if (!holder) return;

    const visual = cloneSourceTemplate(record.template);
    holder.textContent = '';
    while (visual.firstChild) holder.appendChild(visual.firstChild);
  }, [record.template]);

  return <span ref={element} data-sleekfin-header-overflow-visual />;
}

export function HeaderOverflowDrawer({ anchor, onActivate, onClose, records }) {
  const drawer = useRef(null);
  useEffect(() => {
    function closeOnBack(event) {
      const command = event.type === 'command' && event.detail?.command === 'back';
      if (!command && event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }

    if (isTvLayout()) drawer.current?.querySelector('button:not(:disabled)')?.focus();
    window.addEventListener('keydown', closeOnBack, true);
    window.addEventListener('command', closeOnBack, true);
    return () => {
      window.removeEventListener('keydown', closeOnBack, true);
      window.removeEventListener('command', closeOnBack, true);
    };
  }, [anchor, onClose]);

  const bar = anchor.closest('[data-sleekfin-header-proxy]') || anchor;
  const barBounds = bar.getBoundingClientRect();
  const viewport = getPopupViewport();
  const width = Math.min(Math.max(240, barBounds.width), Math.max(0, viewport.width - 24));
  const above = barBounds.top > viewport.top + viewport.height / 2;
  const availableHeight = (above ? barBounds.top - viewport.top : viewport.bottom - barBounds.bottom) - 20;
  const style = {
    left: `${Math.max(viewport.left + 12, Math.min(barBounds.left, viewport.right - width - 12))}px`,
    maxHeight: `${Math.max(0, Math.min(420, viewport.height / 2, availableHeight))}px`,
    width: `${width}px`,
    ...(above ? { bottom: `${window.innerHeight - barBounds.top + 8}px` } : { top: `${barBounds.bottom + 8}px` }),
  };

  return (
    <div data-sleekfin-header-overflow-layer>
      <div data-sleekfin-header-overflow-backdrop onClick={onClose} />
      <div class="focuscontainer" data-sleekfin-header-overflow-drawer data-sleekfin-header-item-list data-sleekfin-header-glass onClick={(event) => event.stopPropagation()} ref={drawer} style={style}>
        {records.map((record, index) => {
          if (record.key === 'separator') return <div data-sleekfin-header-overflow-separator key={`${record.key}-${index}`} />;
          if (record.key === 'space') return <div data-sleekfin-header-overflow-space key={`${record.key}-${index}`} />;
          const iconOnly = record.template.getAttribute('data-sleekfin-header-source-visual') === 'icon-only';
          return (
            <button
              type="button"
              data-sleekfin-current={record.current ? 'true' : 'false'}
              data-sleekfin-header-overflow-full={iconOnly ? 'true' : 'false'}
              data-sleekfin-header-item
              data-sleekfin-header-overflow-item={record.key}
              disabled={record.disabled}
              key={`${record.key}-${index}`}
              onClick={(event) => onActivate(record, event.currentTarget)}
            >
              <OverflowItemVisual record={record} />
              {iconOnly ? <span>{record.caption}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
