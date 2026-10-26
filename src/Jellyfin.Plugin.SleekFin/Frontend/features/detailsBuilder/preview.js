import { dom, item } from '../../shared/runtime.js';
import { createHero } from '../details/hero.jsx';
import { DEFAULT_SETTINGS } from '../details/settings.js';
import { createTrackPickers } from '../details/trackPickers.js';

const TYPES = ['Movie', 'Series', 'Season', 'Episode'];

function titleElement(className, text, tag = 'h1') {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text || '';
  return element;
}

export function createPreview(host, { onItem } = {}) {
  const viewport = dom.element('<div class="sleekfin-details-preview-viewport"><div class="sleekfin-details-preview"><div id="itemBackdrop" class="sleekfin-details-preview-backdrop"></div><div class="detailLogo hide"></div><div class="detailPageWrapperContainer"><div class="nameContainer"></div><div class="itemMiscInfo-primary"></div><p class="overview detail-clamp-text"></p><div class="overview-controls"></div><div class="mainDetailButtons"></div><form class="trackSelections"></form><div class="detailSectionContent"><div class="itemExternalLinks"></div></div><div class="itemDetailsGroup"></div><div class="sleekfin-details-preview-native-info"></div></div></div><div class="sleekfin-details-preview-state"></div></div>');
  const page = viewport.querySelector('.sleekfin-details-preview');
  const message = viewport.querySelector('.sleekfin-details-preview-state');
  const name = page.querySelector('.nameContainer');
  const logo = page.querySelector('.detailLogo');
  const overview = page.querySelector('.overview');
  const languages = page.querySelector('.itemMiscInfo-primary');
  const actions = page.querySelector('.mainDetailButtons');
  const form = page.querySelector('.trackSelections');
  const metadata = page.querySelector('.itemDetailsGroup');
  const externalLinks = page.querySelector('.itemExternalLinks');
  let hero = null;
  let settings = DEFAULT_SETTINGS;
  let current = null;
  let requestedType = '';
  let generation = 0;
  let destroyed = false;
  let client = null;
  let logoImage = null;
  let active = true;
  let cropFrame = 0;
  let languageKey = '';
  const samples = new Map();
  // Focusing Info controls must not pan the cropped hero in clients without overflow: clip.
  function restoreCrop() {
    if (viewport.scrollTop) viewport.scrollTop = 0;
    if (viewport.scrollLeft) viewport.scrollLeft = 0;
  }
  viewport.addEventListener('scroll', restoreCrop, { passive: true });
  host.appendChild(viewport);
  hero = createHero(page, { preview: true });
  const heroElement = page.querySelector('.sleekfin-details-hero');
  const stack = page.querySelector('.sleekfin-details-stack');
  function framePreview() {
    cropFrame = 0;
    if (destroyed || !current || !dom.isVisible(viewport)) return;
    const heroBounds = heroElement.getBoundingClientRect();
    const content = stack.getBoundingClientRect();
    const top = content.top - heroBounds.top;
    const bottom = content.bottom - heroBounds.top;
    const height = heroBounds.height;
    const mobile = viewport.dataset.mobile === 'true';
    const minimum = mobile ? 620 : 346;
    const bottomInset = height - bottom;
    const trim = mobile ? 0 : Math.min(40, bottomInset);
    const preferredHeight = settings.verticalAlignment === 'Top' ? bottom + 24 : settings.verticalAlignment === 'Center' ? content.height + 128 : content.height + 24 + bottomInset - trim;
    const frameHeight = Math.min(height, Math.max(minimum, preferredHeight));
    const position = settings.verticalAlignment === 'Top' ? 0 : settings.verticalAlignment === 'Center' ? (top + bottom - frameHeight) / 2 : height - frameHeight - trim;
    const offset = Math.max(0, Math.min(height - frameHeight, position));
    const captionHeight = host.parentElement.querySelector('.sleekfin-details-builder-caption')?.getBoundingClientRect().height || 0;
    viewport.style.height = `${Math.max(frameHeight, bottom - offset + (captionHeight ? captionHeight + 24 : 0))}px`;
    page.style.top = `${-offset}px`;
    page.style.bottom = 'auto';
  }
  function scheduleFrame() {
    if (!destroyed && !cropFrame) cropFrame = requestAnimationFrame(framePreview);
  }
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleFrame) : null;
  resizeObserver?.observe(heroElement);
  resizeObserver?.observe(stack);
  const contentObserver = resizeObserver ? null : new MutationObserver(scheduleFrame);
  contentObserver?.observe(stack, { childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'], subtree: true });
  window.addEventListener('resize', scheduleFrame);
  const trackPickers = createTrackPickers(page, page.querySelector('.sleekfin-details-preview-native-info'), settings, () => Promise.resolve(settings), (sourceId) => {
    if (current) {
      populateTracks(current.mediaItem, sourceId);
      renderLanguages(current.mediaItem);
    }
  });

  function renderLanguages(mediaItem) {
    const enhanced = window.JellyfinEnhanced;
    const renderer = enhanced?.internals?.features?.displayAudioLanguages;
    const enabled = enhanced?.currentSettings?.showAudioLanguages && typeof renderer === 'function';
    const sourceId = form.querySelector('.selectSource')?.value || null;
    const key = `${mediaItem.Id}|${sourceId || ''}|${Boolean(enabled)}`;
    if (languageKey === key && (!enabled || languages.childElementCount)) return;
    languageKey = key;
    languages.replaceChildren();
    if (!enabled) return;
    // Enhanced completes its language lookup asynchronously, so each sample owns a fresh root.
    const container = document.createElement('span');
    container.className = 'mediaInfoItem-audioLanguage';
    languages.appendChild(container);
    renderer(mediaItem.Id, container, sourceId);
  }

  function closeInfo() {
    const dialog = page.querySelector('.sleekfin-details-track-dialog');
    if (dialog) window.Dashboard?.dialogHelper?.close(dialog);
  }

  function populateTracks(mediaItem, sourceId = '') {
    const sources = mediaItem.MediaSources || [];
    const source = sources.find((entry) => entry.Id === sourceId) || sources[0];
    const streams = source?.MediaStreams || mediaItem.MediaStreams || [];
    const tracks = (type) => streams.filter((stream) => stream.Type === type).sort((a, b) => Number(Boolean(a.IsExternal)) - Number(Boolean(b.IsExternal)) || Number(Boolean(b.IsForced)) - Number(Boolean(a.IsForced)) || Number(Boolean(b.IsDefault)) - Number(Boolean(a.IsDefault)) || a.Index - b.Index);
    const definitions = [
      ['selectSource', 'Version', sources.map((entry) => ({ value: entry.Id, label: entry.Name || mediaItem.Name }))],
      ['selectVideo', 'Video', streams.filter((stream) => stream.Type === 'Video').map((stream) => ({ value: stream.Index, label: stream.DisplayTitle || stream.Title || stream.Codec }))],
      ['selectAudio', 'Audio', tracks('Audio').map((stream) => ({ value: stream.Index, label: stream.DisplayTitle || stream.Title || stream.Codec }))],
      ['selectSubtitles', 'Subtitles', [{ value: -1, label: 'Off' }, ...tracks('Subtitle').map((stream) => ({ value: stream.Index, label: stream.DisplayTitle || stream.Title || stream.Language }))]],
    ];
    definitions.forEach(([className, label, options]) => {
      let select = form.querySelector(`.${className}`);
      if (!select) {
        const container = dom.element('<div class="selectContainer"><label class="selectLabel"></label><select class="emby-select detailTrackSelect"></select><div class="selectArrowContainer"><div style="visibility:hidden;display:none;">0</div><span class="selectArrow material-icons keyboard_arrow_down" aria-hidden="true"></span></div></div>');
        container.querySelector('label').textContent = label;
        select = container.querySelector('select');
        select.classList.add(className);
        form.appendChild(container);
      }
      select.replaceChildren(...options.map(({ value, label: text }) => {
        const option = document.createElement('option');
        option.value = String(value);
        option.textContent = text || '';
        return option;
      }));
      if (className === 'selectSource' && source) select.value = source.Id;
      if (className === 'selectAudio' && options.some((option) => option.value === source?.DefaultAudioStreamIndex)) select.value = String(source.DefaultAudioStreamIndex);
      if (className === 'selectSubtitles') select.value = String(options.some((option) => option.value === source?.DefaultSubtitleStreamIndex) ? source.DefaultSubtitleStreamIndex : -1);
      select.disabled = className === 'selectVideo' || options.length <= 1;
      select.closest('.selectContainer').classList.toggle('hide', className === 'selectSource' ? sources.length <= 1 : options.length === 0 || (className === 'selectSubtitles' && streams.every((stream) => stream.Type !== 'Subtitle')));
    });
    const supported = mediaItem.MediaType === 'Video' && sources.length && !(sources.length === 1 && source.Type === 'Placeholder') && (mediaItem.EnableMediaSourceDisplay != null ? mediaItem.EnableMediaSourceDisplay : !mediaItem.SourceType || mediaItem.SourceType === 'Library');
    form.classList.toggle('hide', !supported);
  }

  function populateMetadata(mediaItem) {
    metadata.replaceChildren();
    const people = mediaItem.People || [];
    const definitions = [
      ...['Author', 'Creator', 'Director', 'Writer'].map((type) => [type, `${type}s`, people.filter((person) => person.Type === type).map((person) => person.Name)]),
      ['Studio', 'Studios', (mediaItem.Studios || []).map((studio) => studio.Name)],
      ['Genre', 'Genres', (mediaItem.GenreItems || []).map((genre) => genre.Name)],
      ['Tags', 'Tags', mediaItem.Tags || []],
    ];
    definitions.forEach(([label, plural, values]) => {
      if (!values.length) return;
      const row = dom.element('<div class="detailsGroupItem"><span class="label"></span><span></span></div>');
      row.firstElementChild.textContent = `${values.length > 1 ? plural : label}:`;
      row.lastElementChild.textContent = values.join(', ');
      metadata.appendChild(row);
    });
    externalLinks.parentElement.replaceChildren(externalLinks);
    externalLinks.replaceChildren();
    [...(mediaItem.HomePageUrl ? [{ Name: 'Website', Url: mediaItem.HomePageUrl }] : []), ...(mediaItem.ExternalUrls || [])].forEach((entry) => {
      try {
        const url = new URL(entry.Url);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return;
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = entry.Name || url.hostname;
        externalLinks.appendChild(link);
      } catch { return; }
    });
    externalLinks.classList.toggle('hide', !externalLinks.childElementCount);
  }

  function setStatus(status, text = '') {
    viewport.dataset.state = status;
    message.textContent = text;
    message.hidden = status === 'ready';
  }

  function showSample(sample) {
    const { mediaItem, seasons } = sample;
    populateTracks(mediaItem);
    populateMetadata(mediaItem);
    const child = mediaItem.Type === 'Season' || mediaItem.Type === 'Episode';
    name.replaceChildren();
    if (child && mediaItem.SeriesName) name.appendChild(titleElement('parentName', mediaItem.SeriesName));
    let displayName = mediaItem.Name;
    if (mediaItem.Type === 'Episode') {
      if (mediaItem.ParentIndexNumber === 0) displayName = `Special - ${mediaItem.Name || ''}`;
      else if (mediaItem.ParentIndexNumber != null && mediaItem.IndexNumber != null) {
        const index = `${mediaItem.IndexNumber}${mediaItem.IndexNumberEnd ? `-${mediaItem.IndexNumberEnd}` : ''}`;
        displayName = `${index}. ${mediaItem.Name || ''}`;
      }
      if (mediaItem.SeriesName && mediaItem.SeasonName && mediaItem.ParentIndexNumber != null) displayName = `${mediaItem.SeasonName} - ${displayName}`;
    }
    name.appendChild(titleElement('itemName', displayName, child ? 'h3' : 'h1'));
    if (mediaItem.OriginalTitle && mediaItem.OriginalTitle !== mediaItem.Name) name.appendChild(titleElement('itemName originalTitle', mediaItem.OriginalTitle, 'h4'));
    overview.textContent = mediaItem.Overview || '';
    overview.classList.toggle('hide', !mediaItem.Overview);
    renderLanguages(mediaItem);
    const logoItem = mediaItem.ImageTags?.Logo ? mediaItem : mediaItem.ParentLogoImageTag && mediaItem.ParentLogoItemId ? { Id: mediaItem.ParentLogoItemId, ImageTags: { Logo: mediaItem.ParentLogoImageTag } } : null;
    const logoUrl = item.imageUrl(logoItem, 'Logo', { maxWidth: 1000 });
    if (logoImage) logoImage.onload = logoImage.onerror = null;
    logo.classList.toggle('hide', !logoUrl);
    logo.style.backgroundImage = logoUrl ? `url("${logoUrl.replace(/["\\]/g, '\\$&')}")` : '';
    if (logoUrl) {
      const image = new Image();
      logoImage = image;
      image.onerror = () => {
        if (destroyed || current !== sample || logoImage !== image) return;
        logo.classList.add('hide');
        hero.sync();
        scheduleFrame();
      };
      image.src = logoUrl;
    }
    hero.render(mediaItem, seasons, { ...settings, trailerBackgroundEnabled: active && settings.trailerBackgroundEnabled });
    trackPickers.update(settings);
    setStatus('ready');
    onItem?.(mediaItem);
    scheduleFrame();
  }

  function load(type) {
    closeInfo();
    const token = ++generation;
    const currentClient = window.ApiClient;
    if (currentClient !== client) {
      client = currentClient;
      samples.clear();
    }
    if (current) hero.render(current.mediaItem, current.seasons, { ...settings, trailerBackgroundEnabled: false });
    current = null;
    setStatus('loading', 'Loading preview…');
    if (!client || !client.getCurrentUserId?.()) {
      setStatus('empty', 'Sign in to load a preview.');
      return;
    }
    if (!samples.has(type)) {
      const userId = client.getCurrentUserId();
      const request = client.getItems(userId, { IncludeItemTypes: type, Recursive: true, Limit: 24, SortBy: 'Random', EnableTotalRecordCount: false, EnableImages: true }).then(async (result) => {
        const candidate = (result.Items || []).find((entry) => item.imageUrl(entry, 'Backdrop', { inherit: true })) || result.Items?.[0];
        if (!candidate) return null;
        const mediaItem = await currentClient.getItem(userId, candidate.Id);
        const seasons = type === 'Series' ? (await currentClient.getSeasons(mediaItem.Id, { userId })).Items || [] : [];
        return { mediaItem, seasons };
      });
      samples.set(type, request);
      request.catch(() => { if (samples.get(type) === request) samples.delete(type); });
    }
    samples.get(type).then((sample) => {
      if (destroyed || token !== generation || currentClient !== window.ApiClient) return;
      if (!sample) {
        setStatus('empty', `No ${type.toLowerCase()} available for preview.`);
        return;
      }
      current = sample;
      showSample(sample);
    }).catch(() => {
      if (destroyed || token !== generation) return;
      setStatus('error', 'Preview could not load.');
    });
  }

  return {
    actions,
    get infoAvailable() { return !destroyed && Boolean(current) && page.querySelector('.sleekfin-details-preview-native-info .sleekfin-details-track-settings')?.hidden === false; },
    update(nextSettings, { mediaType = 'Movie', mobile = false, active: nextActive = true } = {}) {
      if (destroyed) return;
      settings = nextSettings;
      active = nextActive;
      if (!active) closeInfo();
      page.dataset.sleekfinDetailsPreview = mobile ? 'mobile' : 'desktop';
      viewport.dataset.mobile = String(mobile);
      const type = TYPES.includes(mediaType) ? mediaType : 'Movie';
      if (type !== requestedType) {
        requestedType = type;
        load(type);
      } else if (current) {
        renderLanguages(current.mediaItem);
        hero.render(current.mediaItem, current.seasons, { ...settings, trailerBackgroundEnabled: active && settings.trailerBackgroundEnabled });
        trackPickers.update(settings);
        scheduleFrame();
      }
    },
    openInfo(trigger) {
      if (current && active) return trackPickers.open(trigger);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      generation += 1;
      cancelAnimationFrame(cropFrame);
      resizeObserver?.disconnect();
      contentObserver?.disconnect();
      window.removeEventListener('resize', scheduleFrame);
      viewport.removeEventListener('scroll', restoreCrop);
      if (logoImage) logoImage.onload = logoImage.onerror = null;
      trackPickers.destroy();
      hero.destroy();
      viewport.remove();
      samples.clear();
    },
  };
}
