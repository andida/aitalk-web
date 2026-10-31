'use client';

import { useLayoutEffect, useRef } from 'react';

type SavedStyle = { element: HTMLElement; property: string; value: string; priority: string };
type BannerEntry = { banner: HTMLDivElement; spacer: HTMLDivElement; height: number; top: string; topPriority: string; spacerHeight: string };
type Layout = { entries: Set<BannerEntry>; styles: SavedStyle[] };

// Registrations are changed only by committed effects/DOM events. A document's
// banners share offsets, so hiding one cannot reset another instance's layout.
const layouts = new WeakMap<Document, Layout>();

function capture(element: HTMLElement | null, property: string): SavedStyle[] {
  if (!element) return [];
  return [{
    element,
    property,
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }];
}

function updateLayout(layout: Layout) {
  let total = 0;
  for (const entry of layout.entries) {
    entry.banner.style.setProperty('top', `${total}px`);
    entry.spacer.style.height = `${entry.height}px`;
    total += entry.height;
  }
  // Restore all properties before measuring any: for a fixed sidebar with
  // top/bottom and auto height, changing top first would subtract twice.
  for (const saved of layout.styles) {
    saved.element.style.setProperty(saved.property, saved.value, saved.priority);
  }
  if (total === 0) return;
  const bases = layout.styles.map((saved) => {
    const computed = saved.element.ownerDocument.defaultView?.getComputedStyle(saved.element).getPropertyValue(saved.property);
    return computed && computed !== 'auto' ? computed : saved.property === 'height' ? '100vh' : '0px';
  });
  layout.styles.forEach((saved, index) => {
    const sign = saved.property === 'height' ? '-' : '+';
    saved.element.style.setProperty(saved.property, `calc(${bases[index]} ${sign} ${total}px)`, saved.priority);
  });
}

export function useBannerOffset(visible: boolean) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const banner = bannerRef.current;
    const spacer = spacerRef.current;
    if (!visible || !banner || !spacer) return;
    const document = banner.ownerDocument;
    let layout = layouts.get(document);
    if (!layout) {
      const sidebar = document.querySelector<HTMLElement>('[data-slot="sidebar-container"]');
      layout = {
        entries: new Set(),
        styles: [
          ...capture(document.querySelector('header'), 'top'),
          ...capture(sidebar, 'top'),
          ...capture(sidebar, 'height'),
          ...capture(document.querySelector('[data-slot="sidebar-wrapper"]'), 'padding-top'),
        ],
      };
      layouts.set(document, layout);
    }
    const entry: BannerEntry = {
      banner, spacer, height: 0,
      top: banner.style.getPropertyValue('top'),
      topPriority: banner.style.getPropertyPriority('top'),
      spacerHeight: spacer.style.height,
    };
    const activeLayout = layout;
    activeLayout.entries.add(entry);
    let active = true;
    const measure = () => {
      if (!active) return;
      entry.height = banner.offsetHeight;
      updateLayout(activeLayout);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(banner);
    const view = document.defaultView;
    view?.addEventListener('resize', measure);
    return () => {
      active = false;
      observer?.disconnect();
      view?.removeEventListener('resize', measure);
      activeLayout.entries.delete(entry);
      banner.style.setProperty('top', entry.top, entry.topPriority);
      spacer.style.height = entry.spacerHeight;
      updateLayout(activeLayout);
      if (activeLayout.entries.size === 0) layouts.delete(document);
    };
  }, [visible]);

  return { bannerRef, spacerRef };
}
