import { Button, dom, Facts, h, item, useEffect, useRef, useState } from '../../shared/runtime.js';

export function HeroSlide({ entry, active, settings }) {
  const [backdropLoaded, setBackdropLoaded] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const description = useRef(null);
  const displayItem = entry.display;
  const logoUrl = item.imageUrl(displayItem, 'Logo');
  const backdropUrl = item.imageUrl(displayItem, 'Backdrop');
  const showLogo = settings.titleTreatment !== 'Text' && logoUrl && !logoFailed;
  const showText = settings.titleTreatment !== 'Logo' && !showLogo;
  const rating = Number(displayItem.CommunityRating || 0);
  const facts = [];

  if (rating > 0) {
    facts.push({ className: 'sleekfin-hero-score', icon: 'star', text: rating.toFixed(1) });
  }
  facts.push({ text: item.year(displayItem) });
  facts.push({ text: item.typeLabel(displayItem.Type) });
  (displayItem.Genres || []).slice(0, 2).forEach((genre) => facts.push({ text: genre }));
  useEffect(() => (description.current ? dom.expandableText(description.current) : undefined), []);

  return (
    <section class="sleekfin-hero-slide" data-active={active ? 'true' : 'false'}>
      {backdropUrl && <img class="sleekfin-hero-backdrop" src={backdropUrl} data-loaded={backdropLoaded ? 'true' : 'false'} onLoad={() => setBackdropLoaded(true)} />}
      <div class="sleekfin-hero-vignette" />
      <div class="sleekfin-hero-seam" />
      <div class="sleekfin-hero-content">
        <div class="sleekfin-hero-stack">
          <div class="sleekfin-hero-title-box">
            {showLogo && <img class="sleekfin-hero-title-logo" src={logoUrl} data-loaded={logoLoaded ? 'true' : 'false'} onLoad={() => setLogoLoaded(true)} onError={() => setLogoFailed(true)} />}
            {showText && <span class="sleekfin-hero-title">{displayItem.Name || ''}</span>}
          </div>
          <div class="sleekfin-hero-facts">
            <Facts values={facts} />
          </div>
          {displayItem.Overview && <p class="sleekfin-hero-description" ref={description}>{displayItem.Overview}</p>}
          <div class="sleekfin-hero-actions">
            <Button {...item.actionAttributes(entry.play, 'play')} variant="primary" icon="play" label="Play" />
            <Button {...item.actionAttributes(displayItem, 'link')} variant="control" icon="info" label="More info" />
          </div>
        </div>
      </div>
    </section>
  );
}
