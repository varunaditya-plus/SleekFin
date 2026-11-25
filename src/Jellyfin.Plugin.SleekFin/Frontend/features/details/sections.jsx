import { dom, h, render, SectionHeading } from '../../shared/runtime.js';
import { createPlaylist } from './playlist.jsx';

function createHeading(original) {
  const root = document.createElement('div');
  root.className = 'sleekfin-section-heading sleekfin-details-section-heading';
  render(<SectionHeading contentsOnly />, root);
  // JE adds controls to Jellyfin's heading asynchronously, so retain the original node.
  original.classList.add('sleekfin-section-title');
  root.querySelector('.sleekfin-section-copy').appendChild(original);
  return root;
}

function removeHeading({ heading, original, next }, section) {
  if (heading.parentNode === section && heading.contains(original)) {
    section.insertBefore(original, next?.parentNode === section ? next : heading);
  }
  original.classList.remove('sleekfin-section-title');
  render(null, heading);
  heading.remove();
}

export function createSections(page, initialSeasons, playlistOptions) {
  const records = new Map();
  const seasonCards = new Map();
  const playlist = playlistOptions && createPlaylist(page, playlistOptions);
  const nestedSections = {
    BoxSet: '.collectionItems > .verticalSection > .sectionTitleContainer',
    Person: '#childrenContent > .verticalSection > .sectionTitleContainer',
  }[page.dataset.sleekfinItemType];

  function restoreSeasonCard(record) {
    record.added.forEach((node) => node.remove());
    record.buttons.forEach((button) => button.classList.remove('sleekfin-icon-button', 'sleekfin-control-3d', 'sleekfin-details-season-card-play'));
    record.card.classList.remove('sleekfin-details-season-card');
    
    if (record.original) {
      if (record.original.classList.contains('je-hidden')) record.card.classList.add('je-hidden');
      record.original.replaceWith(...record.original.childNodes);
      Array.from(record.card.attributes).forEach(({ name, value }) => record.original.setAttribute(name, value));
      record.original.classList.add('itemAction');
      record.original.appendChild(record.card.firstElementChild);
      record.card.replaceWith(record.original);
    }
  }

  function reconcileSeasonCards(seasons) {
    seasonCards.forEach((record, card) => {
      // JE may retain the original TV card in a Hide handler created before mounting.
      if (record.original?.classList.contains('je-hidden')) {
        record.original.classList.remove('je-hidden');
        card.classList.add('je-hidden');
      }
      if (!page.contains(card) || !page.classList.contains('sleekfin-details-season-posters')) {
        restoreSeasonCard(record);
        seasonCards.delete(card);
      }
    });
    if (!page.classList.contains('sleekfin-details-season-posters')) return;

    page.querySelectorAll('#childrenContent .card[data-type="Season"]').forEach((source) => {
      let record = seasonCards.get(source);
      if (!record) {
        let card = source;
        const original = source.tagName === 'BUTTON' ? source : null;
        if (original) {
          // TV uses the card itself as a button; retain it around the artwork so controls can be siblings.
          card = document.createElement('div');
          Array.from(source.attributes).forEach(({ name, value }) => card.setAttribute(name, value));
          card.classList.remove('itemAction');
          card.removeAttribute('data-action');
          card.removeAttribute('aria-label');
          card.appendChild(source.firstElementChild);
          source.replaceWith(card);
          const scalable = card.querySelector('.cardScalable');
          scalable.replaceWith(source);
          source.className = 'sleekfin-details-season-link itemAction';
          source.appendChild(scalable);
          card.querySelectorAll('.cardBox > .cardText').forEach((text) => source.appendChild(text));
        }
        card.classList.add('sleekfin-details-season-card');
        record = { card, original, added: [], buttons: new Set() };
        seasonCards.set(card, record);
      }

      const { card } = record;
      const box = card.querySelector('.cardBox');
      const season = seasons.find(({ Id }) => Id === card.dataset.id);
      if (!card.querySelector('[is="emby-playstatebutton"]') && season?.UserData) {
        const controls = dom.element('<span class="sleekfin-details-season-card-actions"><button is="emby-playstatebutton" type="button" class="cardOverlayButton itemAction" data-action="none"><span class="material-icons check"></span></button><button is="emby-ratingbutton" type="button" class="cardOverlayButton itemAction" data-action="none"><span class="material-icons favorite"></span></button><button is="paper-icon-button-light" type="button" class="cardOverlayButton itemAction" data-action="menu"><span class="material-icons more_vert"></span></button></span>');
        const [played, favorite, more] = controls.children;
        
        Array.from(controls.children).forEach((button) => {
          button.dataset.id = card.dataset.id;
          button.dataset.serverid = card.dataset.serverid;
        });

        played.dataset.played = String(Boolean(season.UserData.Played));
        favorite.dataset.likes = season.UserData.Likes ?? '';
        favorite.dataset.isfavorite = String(Boolean(season.UserData.IsFavorite));
        more.title = page.querySelector('.btnMoreCommands')?.title || '';
        box.appendChild(controls);
        record.added.push(controls);
        window.CustomElements?.upgradeSubtree?.(controls);
      }

      let play = card.querySelector('button[data-action="play"], button[data-action="resume"]');
      if (!play && season) {
        play = dom.element('<button is="paper-icon-button-light" type="button" class="cardOverlayButton itemAction" data-action="resume"><span class="material-icons play_arrow"></span></button>');
        play.title = page.querySelector('.btnPlay')?.title || '';
        box.appendChild(play);
        record.added.push(play);
        window.CustomElements?.upgradeSubtree?.(play);
      }

      if (play && !play.classList.contains('sleekfin-details-season-card-play')) play.classList.add('sleekfin-details-season-card-play');
      card.querySelectorAll('.cardOverlayButton, .je-hide-btn').forEach((button) => {
        if (!button.classList.contains('sleekfin-icon-button')) button.classList.add('sleekfin-icon-button', 'sleekfin-control-3d');
        record.buttons.add(button);
      });
    });
  }

  function add(section) {
    const record = records.get(section);
    const original = section.querySelector(':scope > .sectionTitle') || record?.original;
    if (!original || !section.contains(original)) return;
    let current = record;
    if (!record || record.heading.parentElement !== section || record.original !== original) {
      if (record) removeHeading(record, section);
      const next = original.nextSibling;
      const heading = createHeading(original);
      section.insertBefore(heading, next);
      current = { heading, original, next };
      records.set(section, current);
    }

    const seasonActions = section.id === 'listChildrenCollapsible' && page.dataset.sleekfinItemType === 'Series'
      && page.classList.contains('sleekfin-details-has-episodes') && !page.classList.contains('sleekfin-details-season-posters');
    current.heading.classList.toggle('sleekfin-details-season-actions', seasonActions);
    const hidden = original.classList.contains('hide') || !original.textContent.trim() || (seasonActions && !original.querySelector('button'));
    if (current.heading.hidden !== hidden) current.heading.hidden = hidden;
  }

  function reconcile(seasons = initialSeasons) {
    page.querySelectorAll('.detailVerticalSection, .jellyseerr-details-section').forEach((section) => {
      if (!playlist || section.id !== 'listChildrenCollapsible') add(section);
    });
    playlist?.reconcile();
    if (nestedSections) {
      records.forEach((record, section) => {
        if (page.contains(section)) return;
        removeHeading(record, section);
        records.delete(section);
      });
      page.querySelectorAll(nestedSections).forEach(add);
    }
    reconcileSeasonCards(seasons);
  }

  reconcile();
  return {
    updatePlaylist(compactEpisodes) {
      playlist?.update(compactEpisodes);
    },
    destroy() {
      records.forEach(removeHeading);
      records.clear();
      seasonCards.forEach(restoreSeasonCard);
      seasonCards.clear();
      playlist?.destroy();
    },
    reconcile,
  };
}
