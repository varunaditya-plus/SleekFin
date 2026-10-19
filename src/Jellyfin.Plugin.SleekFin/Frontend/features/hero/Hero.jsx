import { h, useEffect, useRef, useState } from '../../shared/runtime.js';
import { HeroSlide } from './HeroSlide.jsx';

export function Hero({ entries, root, settings }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef(null);
  const rotationTimer = useRef(0);

  function stopRotation() {
    window.clearInterval(rotationTimer.current);
    rotationTimer.current = 0;
  }

  function startRotation() {
    stopRotation();
    if (entries.length < 2) return;
    rotationTimer.current = window.setInterval(() => {
      // An opened description would otherwise rotate away while it is being read.
      if (!document.hidden && pointerStartX.current === null && !root.querySelector('.sleekfin-hero-slide[data-active="true"] [data-sleekfin-expanded]')) {
        setActiveIndex((index) => (index + 1) % entries.length);
      }
    }, settings.autoRotateSeconds * 1000);
  }

  useEffect(() => {
    setActiveIndex((index) => (entries.length ? index % entries.length : 0));
    startRotation();
    return stopRotation;
  }, [entries.length, settings.autoRotateSeconds]);

  function onPointerDown(event) {
    if (event.pointerType !== 'mouse' || event.button === 0) {
      pointerStartX.current = event.clientX;
    }
  }

  function onPointerUp(event) {
    if (pointerStartX.current === null) return;
    const distance = event.clientX - pointerStartX.current;
    pointerStartX.current = null;
    if (Math.abs(distance) >= 72) {
      setActiveIndex((index) => (index + (distance < 0 ? 1 : entries.length - 1)) % entries.length);
      startRotation();
    }
  }

  function onPointerCancel() {
    pointerStartX.current = null;
  }

  useEffect(() => {
    if (!settings.swipeEnabled) {
      onPointerCancel();
      return undefined;
    }
    root.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerCancel);
    window.addEventListener('blur', onPointerCancel);
    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('blur', onPointerCancel);
      onPointerCancel();
    };
  }, [entries.length, root, settings.autoRotateSeconds, settings.swipeEnabled]);

  return entries.map((entry, index) => <HeroSlide key={`${entry.display.Id || index}-${entry.play.Id || index}`} entry={entry} active={index === activeIndex} settings={settings} />);
}
