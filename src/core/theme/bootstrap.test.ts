import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { themeBootstrap } from './bootstrap';

function run(
  stored: string | null,
  dark: boolean,
  fallback = 'system',
  blocked = false
) {
  const classes = new Set(['font-sans', 'light']);
  const style = { colorScheme: '' };
  vm.runInNewContext(themeBootstrap(fallback), {
    localStorage: {
      getItem: () => {
        if (blocked) throw new Error('blocked');
        return stored;
      },
    },
    window: { matchMedia: () => ({ matches: dark }) },
    document: {
      documentElement: {
        style,
        classList: {
          remove: (...names: string[]) =>
            names.forEach((name) => classes.delete(name)),
          add: (name: string) => classes.add(name),
        },
      },
    },
  });
  return { classes: [...classes], scheme: style.colorScheme };
}

test('bootstrap is standalone and follows system preference', () => {
  assert.deepEqual(run(null, true), {
    classes: ['font-sans', 'dark'],
    scheme: 'dark',
  });
  assert.equal(run(null, false).scheme, 'light');
});
test('stored preference overrides default and system', () => {
  assert.equal(run('light', true, 'dark').scheme, 'light');
  assert.equal(run('dark', false).scheme, 'dark');
  assert.equal(run('system', true, 'light').scheme, 'dark');
});
test('blocked storage and invalid values safely fall back', () => {
  assert.equal(run(null, false, 'dark', true).scheme, 'dark');
  assert.equal(run('invalid', false, 'light').scheme, 'light');
  assert.equal(themeBootstrap('</script>').includes('</script>'), false);
});
