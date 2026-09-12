import { h, dom, Meta, render } from '../../shared/runtime.js';

function release(card, record) {
  render(null, record.meta);
  record.meta.remove();
}

export function createSimilar(page) {
  const records = new Map();

  function valuesFor(card) {
    const endDate = card.dataset.enddate;
    const year = endDate ? endDate.slice(0, 4) : '';
    return [
      { text: year },
      { text: card.dataset.type === 'Movie' ? 'Movie' : 'Series' },
    ];
  }

  function renderItems() {
    page.querySelectorAll('#similarCollapsible .card[data-id]').forEach((card) => {
      const cardBox = card.querySelector('.cardBox');
      if (!cardBox || !dom.isConnected(card)) return;

      let record = records.get(card);
      if (record && record.meta.parentElement !== cardBox) {
        release(card, record);
        record = null;
      }
      if (!record) {
        const meta = document.createElement('div');
        meta.className = 'sleekfin-details-similar-meta sleekfin-meta';
        cardBox.appendChild(meta);
        record = { endDate: '', meta, type: '' };
        records.set(card, record);
      }

      // Jellyfin's similar endpoint returns a different random sample per request, so
      // the rendered cards are the only reliable description of this row. Rebuild the
      // meta line only when the card's own data changes.
      if (record.endDate !== card.dataset.enddate || record.type !== card.dataset.type) {
        record.endDate = card.dataset.enddate;
        record.type = card.dataset.type;
        render(<Meta values={valuesFor(card)} />, record.meta);
      }
    });

    Array.from(records.keys()).forEach((card) => {
      if (!dom.isConnected(card)) {
        release(card, records.get(card));
        records.delete(card);
      }
    });
  }

  return {
    destroy() {
      records.forEach((record, card) => release(card, record));
      records.clear();
    },
    render: renderItems,
  };
}
