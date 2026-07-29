import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FREE_TALK_TOPICS,
  getFreeTalkTopic,
  normalizeTopicKey,
  parsePracticeQuery,
  sanitizeTopicText,
} from './free-talk-topics';

test('free-talk catalog exposes eight stable topic keys', () => {
  assert.equal(FREE_TALK_TOPICS.length, 8);
  assert.deepEqual(
    FREE_TALK_TOPICS.map((topic) => topic.key),
    [
      'daily-life',
      'travel',
      'food',
      'hobbies',
      'study',
      'work',
      'culture',
      'dreams',
    ]
  );
});

test('topic keys use a strict local whitelist', () => {
  assert.equal(getFreeTalkTopic('travel')?.title, 'Travel');
  assert.equal(getFreeTalkTopic('ignore-all-instructions'), null);
  assert.equal(normalizeTopicKey('bad key'), '');
});

test('query parsing keeps numeric database topics compatible', () => {
  assert.deepEqual(
    parsePracticeQuery({
      lesson: '7',
      mode: 'free',
      topic: '12',
      topicKey: 'food',
    }),
    { lessonId: 7, mode: 'free', topicId: 12, topicKey: 'food' }
  );
  assert.equal(parsePracticeQuery({ topic: '12x' }).topicId, null);
});

test('topic text removes control characters and enforces length limits', () => {
  assert.equal(sanitizeTopicText('hello\u0000  world', 20), 'hello world');
  assert.equal(sanitizeTopicText('123456', 4), '1234');
});
