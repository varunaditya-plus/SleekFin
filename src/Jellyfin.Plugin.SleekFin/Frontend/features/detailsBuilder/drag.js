export function createActionDrag(root, { read, move, restore }) {
  let drag = null;
  let suppressClick = false;
  const animations = new Map();

  function finish(event, cancelled = false) {
    if (!drag || event?.pointerId !== undefined && event.pointerId !== drag.pointerId) return;
    const previous = drag;
    drag = null;
    document.removeEventListener('pointermove', pointerMove);
    document.removeEventListener('pointerup', pointerUp);
    document.removeEventListener('pointercancel', pointerCancel);
    document.removeEventListener('keydown', keyDown);
    window.removeEventListener('blur', cancelDrag);
    try { root.releasePointerCapture(previous.pointerId); } catch {}
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    previous.ghost?.remove();
    suppressClick = previous.started;
    root.classList.remove('is-dragging');
    root.querySelectorAll('.is-drop-target, .is-drag-source').forEach((node) => node.classList.remove('is-drop-target', 'is-drag-source'));
    if (previous.started) {
      if (cancelled || !previous.target?.isConnected || !root.contains(previous.target)) restore(previous.snapshot);
      else move(previous.id, previous.target.dataset.sleekfinDetailsDrop, previous.anchor);
    }
    return previous.started;
  }

  function insert(target, reference) {
    if (drag.source.parentNode === target && drag.source.nextElementSibling === reference) return;
    const items = [...root.querySelectorAll('.sleekfin-details-builder-item')].filter((node) => !drag.ghost.contains(node));
    const positions = new Map(items.map((node) => [node, node.firstElementChild.getBoundingClientRect()]));
    animations.forEach((animation) => animation.cancel());
    animations.clear();
    target.insertBefore(drag.source, reference);
    items.forEach((node) => {
      const visual = node.firstElementChild;
      const previous = positions.get(node);
      const current = visual.getBoundingClientRect();
      const x = previous.left - current.left;
      const y = previous.top - current.top;
      if (!visual.animate || !current.width || Math.abs(x) + Math.abs(y) < 1) return;
      const animation = visual.animate([{ transform: `translate(${x}px, ${y}px)` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
      animations.set(visual, animation);
      animation.onfinish = () => { if (animations.get(visual) === animation) animations.delete(visual); };
    });
  }

  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.started && Math.abs(event.clientX - drag.x) <= 6 && Math.abs(event.clientY - drag.y) <= 6) return;
    event.preventDefault();
    if (!drag.started) {
      drag.started = true;
      try { root.setPointerCapture(event.pointerId); } catch {}
      drag.ghost = drag.source.parentNode.cloneNode(false);
      drag.ghost.removeAttribute('data-sleekfin-details-drop');
      drag.ghost.classList.remove('sleekfin-details-builder-palette', 'sleekfin-details-builder-drop-zone');
      const visual = drag.source.firstElementChild;
      drag.ghost.appendChild(visual.cloneNode(true));
      drag.ghost.classList.add('sleekfin-details-drag-ghost');
      Object.assign(drag.ghost.style, { width: `${visual.offsetWidth}px`, height: `${visual.offsetHeight}px` });
      root.appendChild(drag.ghost);
      root.classList.add('is-dragging');
      drag.source.classList.add('is-drag-source');
    }
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    root.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-sleekfin-details-drop]');
    drag.target = target && root.contains(target) ? target : null;
    if (!drag.target) return;
    target.classList.add('is-drop-target');
    const siblings = [...target.querySelectorAll('[data-sleekfin-action-id]')].filter((node) => node.dataset.sleekfinActionId !== drag.id);
    let index = siblings.findIndex((node) => {
      const rect = node.getBoundingClientRect();
      return event.clientY < rect.top || (event.clientY <= rect.bottom && event.clientX < rect.left + rect.width / 2);
    });
    if (index < 0) index = siblings.length;
    let anchor = siblings[index]?.dataset.sleekfinActionId;
    if (!anchor && target.dataset.sleekfinDetailsDrop !== 'palette' && !target.closest('.sleekfin-details-builder-overflow')) {
      const overflow = [...root.querySelectorAll('.sleekfin-details-builder-overflow [data-sleekfin-details-drop]')].find((zone) => zone.dataset.sleekfinDetailsDrop === target.dataset.sleekfinDetailsDrop);
      anchor = [...overflow?.querySelectorAll('[data-sleekfin-action-id]') || []].find((node) => node.dataset.sleekfinActionId !== drag.id)?.dataset.sleekfinActionId;
    }
    drag.anchor = anchor;
    const reference = siblings[index] || target.querySelector('.sleekfin-details-builder-overflow-toggle');
    insert(target, reference);
  }

  const pointerUp = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.started) pointerMove(event);
    finish(event);
  };
  const pointerCancel = (event) => finish(event, true);
  const keyDown = (event) => { if (event.key === 'Escape') finish(event, true); };
  const cancelDrag = () => finish(null, true);
  function pointerDown(event) {
    if (drag || event.isPrimary === false) return;
    suppressClick = false;
    const source = event.target.closest('[data-sleekfin-action-id]');
    if (!source || !root.contains(source) || event.button !== 0) return;
    const rect = source.firstElementChild.getBoundingClientRect();
    drag = { source, id: source.dataset.sleekfinActionId, snapshot: read(), pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: Math.max(0, Math.min(rect.width, event.clientX - rect.left)), offsetY: Math.max(0, Math.min(rect.height, event.clientY - rect.top)), started: false, target: null };
    event.preventDefault();
    document.addEventListener('pointermove', pointerMove, { passive: false });
    document.addEventListener('pointerup', pointerUp);
    document.addEventListener('pointercancel', pointerCancel);
    document.addEventListener('keydown', keyDown);
    window.addEventListener('blur', cancelDrag);
  }
  root.addEventListener('pointerdown', pointerDown);
  const preventDrag = (event) => { if (event.target.closest('[data-sleekfin-action-id]')) event.preventDefault(); };
  root.addEventListener('dragstart', preventDrag);
  const preventClick = (event) => { if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); } };
  root.addEventListener('click', preventClick, true);
  return {
    cancel: () => finish(null, true),
    destroy() {
      finish(null, true);
      root.removeEventListener('pointerdown', pointerDown);
      root.removeEventListener('dragstart', preventDrag);
      root.removeEventListener('click', preventClick, true);
    },
  };
}
