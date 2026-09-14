'use client';

import { useLayoutEffect, useRef } from 'react';

export function NavIndicator({ activeHref }: { activeHref: string | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const indicator = ref.current;
    const container = indicator?.parentElement;
    if (!indicator || !container) return;
    const links = container.querySelectorAll<HTMLAnchorElement>('a[aria-current]');
    const active = Array.from(links).find((link) => link.getAttribute('href') === activeHref);
    const measure = () => {
      if (!active || !container.getClientRects().length) {
        indicator.style.opacity = '0';
        return;
      }
      const parent = container.getBoundingClientRect();
      const target = active.getBoundingClientRect();
      // Include scroll offsets so the highlight stays aligned in the mobile menu.
      indicator.style.transform = `translate(${target.left - parent.left + container.scrollLeft - container.clientLeft}px, ${target.top - parent.top + container.scrollTop - container.clientTop}px)`;
      indicator.style.width = `${target.width}px`;
      indicator.style.height = `${target.height}px`;
      indicator.style.opacity = '1';
    };
    measure();
    const frame = requestAnimationFrame(() => { indicator.dataset.ready = 'true'; });
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll('a').forEach((link) => observer.observe(link));
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [activeHref]);

  return <span ref={ref} className="nav-selection-indicator" aria-hidden="true" />;
}
