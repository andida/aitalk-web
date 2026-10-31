import assert from 'node:assert/strict';
import test from 'node:test';

import { readPostFrontmatter } from './post-frontmatter';

test('reads valid content metadata and YAML dates', () => {
  const result = readPostFrontmatter({
    created_at: new Date('2025-10-24T00:00:00.000Z'),
    author_name: 'Admin',
    author_image: '/logo.png',
    date: '2024-11-24',
    image: '/image.png',
    version: '1.0.0',
    tags: ['AI', 'Next.js'],
    categories: [{ title: 'News', url: '/blog/news' }],
  });
  assert.equal(result.created_at, '2025-10-24T00:00:00.000Z');
  assert.equal(result.date, '2024-11-24');
  assert.equal(result.author_name, 'Admin');
  assert.deepEqual(result.tags, ['AI', 'Next.js']);
  assert.equal(result.categories[0]?.title, 'News');
  assert.equal(result.categories[0]?.url, '/blog/news');
});

test('rejects malformed optional values without throwing', () => {
  const result = readPostFrontmatter({
    created_at: new Date('invalid'),
    author_name: { malicious: true },
    image: 42,
    tags: ['valid', 3, null],
    categories: [null, 'invalid', { title: 42, url: '/safe' }],
  });
  assert.equal(result.created_at, undefined);
  assert.equal(result.author_name, undefined);
  assert.equal(result.image, undefined);
  assert.deepEqual(result.tags, ['valid']);
  assert.equal(result.categories.length, 1);
  assert.equal(result.categories[0]?.title, undefined);
  assert.equal(result.categories[0]?.url, '/safe');
  assert.deepEqual(readPostFrontmatter(null).tags, []);
});
