export function formatRuntime(ticks) {
  const minutes = Math.round(Number(ticks || 0) / 600000000);
  if (!minutes) return '';

  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

export function year(item) {
  if (item?.ProductionYear) return String(item.ProductionYear);
  return item?.PremiereDate ? String(new Date(item.PremiereDate).getFullYear()) : '';
}

export function typeLabel(type) {
  return type === 'Series' ? 'TV Show' : type || '';
}

export function episodeTitle(item) {
  const season = item.ParentIndexNumber != null ? `S${item.ParentIndexNumber}` : '';
  const episode = item.IndexNumber != null ? `E${item.IndexNumber}${item.IndexNumberEnd != null ? `-E${item.IndexNumberEnd}` : ''}` : '';
  return `${season}${episode}${season || episode ? ' - ' : ''}${item.Name || ''}`;
}

export function canDownload(item) {
  return ['Movie', 'Episode', 'Trailer', 'Video'].includes(item.Type) && item.CanDownload === true && (!window.NativeShell || window.NativeShell.AppHost.supports('filedownload'));
}

export function imageUrl(item, type, options) {
  const client = window.ApiClient;
  const settings = options || {};
  let tags = type === 'Backdrop' ? item?.BackdropImageTags : item?.ImageTags && [item.ImageTags[type]];
  let tag = tags && tags[0];
  let ownerId = item?.Id;

  if (type === 'Backdrop' && !tag && settings.inherit) {
    tags = item?.ParentBackdropImageTags;
    tag = tags && tags[0];
    ownerId = item?.ParentBackdropItemId || item?.SeriesId || item?.ParentId;
  }
  if (!tag || !ownerId || !client || typeof client.getImageUrl !== 'function') return '';

  const imageOptions = { tag, type };
  if (type === 'Backdrop') {
    imageOptions.index = 0;
  }
  if (settings.maxWidth) {
    imageOptions.maxWidth = settings.maxWidth;
  }
  if (settings.quality) {
    imageOptions.quality = settings.quality;
  }
  return client.getImageUrl(ownerId, imageOptions);
}

export function actionAttributes(item, action) {
  const client = window.ApiClient;
  const position = Number(item?.UserData?.PlaybackPositionTicks || 0);
  const serverId = item?.ServerId || (client && typeof client.serverId === 'function' ? client.serverId() : '');
  const attributes = {
    class: 'itemAction',
    'data-action': action || (position > 0 ? 'resume' : 'play'),
    'data-id': item?.Id || '',
    'data-isfolder': String(Boolean(item?.IsFolder)),
    'data-mediatype': item?.MediaType || 'Video',
    'data-type': item?.Type || '',
  };

  if (serverId) {
    attributes['data-serverid'] = serverId;
  }
  if (!action) {
    attributes['data-positionticks'] = String(position);
  }
  return attributes;
}

export default {
  actionAttributes,
  canDownload,
  episodeTitle,
  formatRuntime,
  imageUrl,
  typeLabel,
  year,
};
