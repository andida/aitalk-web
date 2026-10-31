type CarouselNavigationApi = {
  canScrollPrev(): boolean;
  canScrollNext(): boolean;
  on(event: 'select' | 'reInit', callback: () => void): unknown;
  off(event: 'select' | 'reInit', callback: () => void): unknown;
};

export function carouselNavigationSnapshot(
  api: CarouselNavigationApi | undefined
): number {
  return (api?.canScrollPrev() ? 1 : 0) | (api?.canScrollNext() ? 2 : 0);
}

export function subscribeCarouselNavigation(
  api: CarouselNavigationApi | undefined,
  onChange: () => void
): () => void {
  if (!api) return () => {};
  api.on('select', onChange);
  api.on('reInit', onChange);
  return () => {
    api.off('select', onChange);
    api.off('reInit', onChange);
  };
}
