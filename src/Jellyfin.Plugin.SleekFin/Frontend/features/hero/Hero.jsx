import { h, useEffect, useRef, useState } from '../../shared/runtime.js';
import { HeroSlide } from './HeroSlide.jsx';

export function Hero({ entries, root, settings }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartX = useRef(null);
  const rotationTimer = useRef(0);
  const pendingFocus = useRef(null);

  function stopRotation() {
    window.clearInterval(rotationTimer.current);
    rotationTimer.current = 0;
  }

  function startRotation() {
    stopRotation();
    if (entries.length < 2) return;
    rotationTimer.current = window.setInterval(() => {
      // An opened description would otherwise rotate away while it is being read.
      if (!document.hidden && (!document.documentElement.classList.contains('layout-tv') || root.getClientRects().length > 0 && !root.contains(document.activeElement)) && pointerStartX.current === null && !root.querySelector('.sleekfin-hero-slide[data-active="true"] [data-sleekfin-expanded]')) {
        setActiveIndex((index) => (index + 1) % entries.length);
      }
    }, settings.autoRotateSeconds * 1000);
  }

  useEffect(() => {
    setActiveIndex((index) => (entries.length ? index % entries.length : 0));
    startRotation();
    return stopRotation;
  }, [entries.length, settings.autoRotateSeconds]);

  useEffect(() => {
    if (pendingFocus.current === null) return;
    const buttons = root.querySelectorAll('.sleekfin-hero-slide[data-active="true"] .sleekfin-hero-actions button');
    buttons[pendingFocus.current === 'first' ? 0 : buttons.length - 1]?.focus();
    pendingFocus.current = null;
  }, [activeIndex]);

  useEffect(() => {
    function navigate(event) {
      if (event.defaultPrevented || !document.documentElement.classList.contains('layout-tv') || entries.length < 2) return;
      const key = event.type === 'command' ? event.detail?.command : event.key;
      const direction = key === 'ArrowLeft' || key === 'left' ? -1 : key === 'ArrowRight' || key === 'right' ? 1 : 0;
      const button = event.target.closest?.('.sleekfin-hero-actions button');
      if (!direction || !button) return;
      const previous = (direction < 0) !== (getComputedStyle(button.parentElement).direction === 'rtl');
      if (previous ? button.previousElementSibling : button.nextElementSibling) return;
      event.preventDefault();
      event.stopPropagation();
      pendingFocus.current = previous ? 'last' : 'first';
      setActiveIndex((index) => (index + (previous ? -1 : 1) + entries.length) % entries.length);
      startRotation();
    }
    root.addEventListener('keydown', navigate);
    root.addEventListener('command', navigate);
    return () => {
      root.removeEventListener('keydown', navigate);
      root.removeEventListener('command', navigate);
    };
  }, [entries.length, root, settings.autoRotateSeconds]);

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
