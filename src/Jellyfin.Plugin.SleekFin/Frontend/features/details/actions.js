import { decorateNativeButton, restoreNativeButton } from '../../shared/runtime.js';

export function createActions(container, item) {
  // Jellyfin's detail template hardcodes data-action="resume" on the primary button and only ever
  // updates its title, so the label is decided by the item's own playback position instead. The
  // play-from-the-beginning button keeps its own name whatever that position is.
  const isResumable = Number(item.UserData?.PlaybackPositionTicks || 0) > 0;
  const hasEpisodeResume = item.Type === 'Episode' && isResumable;
  const decorated = new Set();

  function reconcile() {
    const buttons = container.querySelectorAll('.btnPlay, .btnReplay, .btnDownload, .btnUserRating');

    buttons.forEach((element) => {
      const isFavorite = element.classList.contains('btnUserRating');
      const isDownload = element.classList.contains('btnDownload');
      const isReplay = element.dataset.action === 'play';
      const icon = isFavorite ? (element.dataset.isfavorite === 'true' ? 'bookmarkCheck' : 'bookmark') : isDownload ? 'download' : 'play';
      const label = isFavorite ? (element.dataset.isfavorite === 'true' ? 'In watchlist' : 'Add to watchlist') : isDownload ? 'Download' : isResumable && !isReplay ? 'Resume' : 'Play';

      element.classList.toggle('sleekfin-details-suppressed-action', hasEpisodeResume && isReplay);
      decorateNativeButton(element, {
        content: element.querySelector('.detailButton-content') || element,
        icon,
        label,
        variant: icon === 'play' ? 'primary' : 'control',
      });
      decorated.add(element);
    });
  }

  const observer = new MutationObserver(reconcile);
  observer.observe(container, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-isfavorite'],
  });

  return {
    destroy() {
      observer.disconnect();
      decorated.forEach((element) => {
        element.classList.remove('sleekfin-details-suppressed-action');
        restoreNativeButton(element);
      });
      decorated.clear();
    },
    reconcile,
  };
}
