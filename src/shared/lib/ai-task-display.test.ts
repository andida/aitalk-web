import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAITaskDisplay } from './ai-task-display';

test('parses supported errors, songs and images', () => {
  assert.deepEqual(parseAITaskDisplay('{"errorMessage":"failed"}'), {
    kind: 'error',
    message: 'failed',
  });
  assert.deepEqual(
    parseAITaskDisplay(
      '{"songs":[{"id":"1","title":"Song","audioUrl":"https://example.test/a"}]}'
    ),
    {
      kind: 'songs',
      items: [{ id: '1', title: 'Song', audioUrl: 'https://example.test/a' }],
    }
  );
  assert.deepEqual(
    parseAITaskDisplay('{"images":[{"imageUrl":"https://example.test/i"}]}'),
    {
      kind: 'images',
      items: [{ imageUrl: 'https://example.test/i' }],
    }
  );
});

test('filters invalid provider results without crashing the activity page', () => {
  assert.deepEqual(parseAITaskDisplay('{'), { kind: 'empty' });
  assert.deepEqual(parseAITaskDisplay('{"songs":[null,{"audioUrl":4}]}'), {
    kind: 'songs',
    items: [],
  });
  assert.deepEqual(parseAITaskDisplay('{"images":[{},null]}'), {
    kind: 'images',
    items: [],
  });
});
