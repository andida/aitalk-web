import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './carousel';

test('carousel renders a stable disabled navigation state on the server', () => {
  const html = renderToStaticMarkup(
    <Carousel>
      <CarouselContent>
        <CarouselItem>First slide</CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  );
  assert.match(html, /First slide/);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
});
