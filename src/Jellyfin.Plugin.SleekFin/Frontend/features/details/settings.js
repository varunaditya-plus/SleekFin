export function loadSettings(client) {
  return client.ajax({
    type: 'GET',
    url: client.getUrl('SleekFin/Details/Settings'),
    dataType: 'json',
  }).then((settings) => ({
    compactEpisodeGridCardsEnabled: settings?.compactEpisodeGridCardsEnabled === true,
    dropdownStyle: ['Jellyfin', 'SeerrFin', 'Native'].includes(settings?.dropdownStyle) ? settings.dropdownStyle : 'Jellyfin',
    seasonPostersEnabled: settings?.seasonPostersEnabled === true,
    trailerBackgroundEnabled: settings?.trailerBackgroundEnabled === true,
  }));
}
