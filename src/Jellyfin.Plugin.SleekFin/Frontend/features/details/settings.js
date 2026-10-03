function normalizeSettings(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    seasonPickerEnabled: source.seasonPickerEnabled === true,
    trailerBackgroundEnabled: source.trailerBackgroundEnabled === true,
  };
}

export function loadSettings(client) {
  return client.ajax({
    type: 'GET',
    url: client.getUrl('SleekFin/Details/Settings'),
    dataType: 'json',
  }).then(normalizeSettings);
}
