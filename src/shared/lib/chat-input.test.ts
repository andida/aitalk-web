import assert from 'node:assert/strict';
import test from 'node:test';

import { isPromptInputMessage, parseChatRequestMetadata } from './chat-input';

test('accepts valid text, attachments, and provider metadata', () => {
  assert.equal(isPromptInputMessage({ text: 'hello' }), true);
  assert.equal(
    isPromptInputMessage({
      files: [
        {
          type: 'file',
          mediaType: 'image/png',
          url: 'data:image/png;base64,AA==',
          providerMetadata: { provider: { nested: ['value', 1, null] } },
        },
      ],
    }),
    true
  );
});

test('rejects malformed input and attachment metadata', () => {
  assert.equal(isPromptInputMessage(null), false);
  assert.equal(isPromptInputMessage({ text: 5 }), false);
  assert.equal(
    isPromptInputMessage({ files: [{ type: 'file', url: 'x' }] }),
    false
  );
  assert.equal(
    isPromptInputMessage({
      files: [
        {
          type: 'file',
          url: 'x',
          mediaType: 'image/png',
          providerMetadata: { provider: 1 },
        },
      ],
    }),
    false
  );
});

test('normalizes legacy JSON metadata and rejects malformed values', () => {
  assert.deepEqual(parseChatRequestMetadata('{"model":"test"}'), {
    model: 'test',
  });
  assert.deepEqual(parseChatRequestMetadata('{'), {});
  assert.deepEqual(parseChatRequestMetadata('[1,2]'), {});
});
