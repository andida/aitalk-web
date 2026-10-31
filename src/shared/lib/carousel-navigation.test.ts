import assert from 'node:assert/strict';
import test from 'node:test';

import {
  carouselNavigationSnapshot,
  subscribeCarouselNavigation,
} from './carousel-navigation';

test('carousel navigation reflects the current API and unsubscribes both events', () => {
  const callbacks = new Map<string, () => void>();
  let previous = false;
  let next = true;
  let changes = 0;
  const api = {
    canScrollPrev: () => previous,
    canScrollNext: () => next,
    on: (event: string, callback: () => void) => callbacks.set(event, callback),
    off: (event: string, callback: () => void) => {
      if (callbacks.get(event) === callback) callbacks.delete(event);
    },
  };
  assert.equal(carouselNavigationSnapshot(undefined), 0);
  assert.equal(carouselNavigationSnapshot(api), 2);
  const unsubscribe = subscribeCarouselNavigation(api, () => {
    changes += 1;
  });
  previous = true;
  next = false;
  callbacks.get('select')?.();
  assert.equal(carouselNavigationSnapshot(api), 1);
  callbacks.get('reInit')?.();
  assert.equal(changes, 2);
  unsubscribe();
  assert.equal(callbacks.size, 0);
});
