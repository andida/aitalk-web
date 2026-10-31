import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractMediaUrls, parseMediaTaskResult } from './media-task-result';

test('image results support string, array and object provider formats', () => {
  assert.deepEqual(
    extractMediaUrls({ output: 'https://test.invalid/a' }, 'image'),
    ['https://test.invalid/a']
  );
  assert.deepEqual(
    extractMediaUrls(
      {
        images: [
          { imageUrl: 'https://test.invalid/b' },
          { uri: 'https://test.invalid/c' },
          null,
        ],
      },
      'image'
    ),
    ['https://test.invalid/b', 'https://test.invalid/c']
  );
  assert.deepEqual(
    extractMediaUrls({ data: { src: 'https://test.invalid/d' } }, 'image'),
    ['https://test.invalid/d']
  );
});

test('video arrays take precedence, filter non-string URLs and preserve order', () => {
  assert.deepEqual(
    extractMediaUrls(
      {
        videos: [{ url: 'a' }, 'b', { url: 5 }, { videoUrl: 'c' }],
        output: 'ignored',
      },
      'video'
    ),
    ['a', 'b', 'c']
  );
  assert.deepEqual(
    extractMediaUrls({ videos: [], output: 'ignored' }, 'video'),
    []
  );
  assert.deepEqual(
    extractMediaUrls({ output: [{ src: 'a' }, { video: 'b' }] }, 'video'),
    ['a', 'b']
  );
});

test('parsing rejects absent, malformed and non-object JSON', () => {
  assert.equal(parseMediaTaskResult(null), null);
  assert.equal(parseMediaTaskResult('42'), null);
  assert.equal(parseMediaTaskResult('[]'), null);
  const originalWarn = console.warn;
  try {
    console.warn = () => {};
    assert.equal(parseMediaTaskResult('{'), null);
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(parseMediaTaskResult('{"errorMessage":"failed"}'), {
    errorMessage: 'failed',
  });
  assert.deepEqual(extractMediaUrls(null, 'image'), []);
});
