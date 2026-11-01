import { dom, h, item, Meta, render } from '../../shared/runtime.js';

function facts(mediaItem, type, original) {
  const values = [];
  const score = Number(mediaItem?.CommunityRating || 0);
  const episode = mediaItem?.ParentIndexNumber && mediaItem?.IndexNumber ? `S${mediaItem.ParentIndexNumber}:E${mediaItem.IndexNumber}` : '';
  const date = /^\d{4}(?:\s*-\s*(?:\d{4}|Present))?$/.test(original) ? original : item.year(mediaItem);
  const fallback = item.formatRuntime(mediaItem?.RunTimeTicks) || mediaItem?.OfficialRating || mediaItem?.Status || '';

  if (score > 0) {
    values.push({ accent: true, icon: 'star', text: score.toFixed(1) });
  }
  if (type === 'Episode' && episode) {
    values.push({ text: episode });
  } else if (date) {
    values.push({ text: date });
  }
  if (values.length < 2 && fallback) {
    values.push({ text: fallback });
  }
  values.push({ text: item.typeLabel(type) });
  return values.slice(0, 3);
}

function unmountMetadata(element) {
  render(null, element);
  element.remove();
}

export function cleanupMetadata(scope = document) {
  scope.querySelectorAll('[data-sleekfin-media-meta]').forEach(unmountMetadata);
  scope.querySelectorAll('.sleekfin-media-meta-source').forEach((element) => {
    element.classList.remove('sleekfin-media-meta-source');
  });
}

export function cleanupInactiveMetadata(activeCards) {
  document.querySelectorAll('[data-sleekfin-media-meta], .sleekfin-media-meta-source').forEach((element) => {
    const card = element.closest('.card');
    if (!card || !activeCards.has(card)) {
      if (element.matches('[data-sleekfin-media-meta]')) {
        unmountMetadata(element);
      } else {
        element.classList.remove('sleekfin-media-meta-source');
      }
    }
  });
}

function sourceElement(card) {
  return Array.from(card.querySelectorAll('.cardText-secondary')).find((element) => !element.hasAttribute('data-sleekfin-media-meta')) || null;
}

function metadataElement(card, source) {
  let element = card.querySelector('[data-sleekfin-media-meta]');
  if (!element) {
    element = document.createElement('div');
    element.className = 'cardText cardText-secondary sleekfin-meta';
    element.dataset.sleekfinMediaMeta = 'true';
  }
  element.classList.add('sleekfin-meta');

  card.querySelectorAll('.sleekfin-media-meta-source').forEach((candidate) => {
    if (candidate !== source) {
      candidate.classList.remove('sleekfin-media-meta-source');
    }
  });
  if (source) {
    source.classList.add('sleekfin-media-meta-source');
    if (element.previousElementSibling !== source) {
      dom.insertAfter(source, element);
    }
  } else if (!dom.isConnected(element)) {
    const title = card.querySelector('.cardText-first');
    if (title) {
      dom.insertAfter(title, element);
    }
  }
  return element;
}

function fitMetadata(element) {
  if (!dom.isVisible(element)) return;

  const entries = Array.from(element.children);
  entries.forEach((entry) => { entry.style.display = ''; });
  const bounds = element.getBoundingClientRect();
  const overflowing = entries.map((entry) => {
    const entryBounds = entry.getBoundingClientRect();
    return entryBounds.left < bounds.left || entryBounds.right > bounds.right;
  });
  entries.forEach((entry, index) => { entry.style.display = overflowing[index] ? 'none' : ''; });
}

export function renderMetadata(card, mediaItem) {
  const type = mediaItem?.Type || card.dataset.type || '';
  if (!item.typeLabel(type) || type === 'CollectionFolder') {
    cleanupMetadata(card);
    return;
  }

  const source = sourceElement(card);
  const element = metadataElement(card, source);
  if (!dom.isConnected(element)) return;

  render(<Meta values={facts(mediaItem, type, source?.textContent.trim() || '')} />, element);
  fitMetadata(element);
}
