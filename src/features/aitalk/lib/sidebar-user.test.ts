import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAitalkSidebarUser } from './sidebar-user';

test('sidebar identity prioritizes the learner profile', () => {
  assert.deepEqual(
    resolveAitalkSidebarUser(
      {
        user_id: 'user-1',
        nick_name: 'Lin',
        avatar: 'https://example.com/lin.jpg',
        level_language: '3',
        learn_language: 'English',
      },
      {
        email: 'account@example.com',
        user_metadata: {
          full_name: 'Account name',
          avatar_url: 'https://example.com/account.jpg',
        },
      }
    ),
    {
      avatarUrl: 'https://example.com/lin.jpg',
      email: 'account@example.com',
      initials: 'L',
      learningSummary: 'Level 3 | Learning English',
      name: 'Lin',
    }
  );
});

test('sidebar identity falls back to auth metadata and email', () => {
  assert.deepEqual(
    resolveAitalkSidebarUser(null, {
      email: 'learner@example.com',
      user_metadata: {
        full_name: '陈晨',
        picture: 'https://example.com/avatar.jpg',
      },
    }),
    {
      avatarUrl: 'https://example.com/avatar.jpg',
      email: 'learner@example.com',
      initials: '陈',
      learningSummary: 'Your learning profile',
      name: '陈晨',
    }
  );

  assert.equal(
    resolveAitalkSidebarUser(null, { email: 'fallback@example.com' }).name,
    'fallback'
  );
});
