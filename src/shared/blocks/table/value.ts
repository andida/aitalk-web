import type {
  TableAction,
  TableScalar,
  TableUser,
} from '@/shared/types/blocks/table';

// Read data properties only. Untrusted objects must not execute getters or
// contribute inherited fields (including polluted prototypes) to a cell.
export function ownValue(value: unknown, key: string): unknown {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }
  try {
    const property = Object.getOwnPropertyDescriptor(value, key);
    return property && 'value' in property ? property.value : undefined;
  } catch {
    return undefined;
  }
}

export function scalarValue(value: unknown): TableScalar {
  return value == null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'bigint' ||
    typeof value === 'boolean'
    ? value
    : undefined;
}

// URLs may be absolute HTTP(S) or relative. Do not let browser URL parsing
// turn control characters, backslashes or an executable scheme into a link.
export function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f\\]/.test(value)) {
    return undefined;
  }
  const url = value.trim();
  if (!url) {
    return undefined;
  }
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(url);
  if (scheme && !/^https?$/i.test(scheme[1])) {
    return undefined;
  }
  return url;
}

export function userValue(value: unknown): TableUser | undefined {
  const name = ownValue(value, 'name');
  const email = ownValue(value, 'email');
  if (typeof name !== 'string' || typeof email !== 'string') {
    return undefined;
  }
  return { name, email, image: safeUrl(ownValue(value, 'image')) };
}

// Bound logical length, including holes, before reading any entries. Menus over
// this limit are rejected explicitly, never silently truncated or hidden.
export const MAX_TABLE_ACTIONS = 256;

export function actionValues(value: unknown): TableAction[] {
  // Array.isArray can itself throw for a revoked Proxy.
  try {
    if (!Array.isArray(value)) return [];
  } catch {
    return [];
  }
  const length = ownValue(value, 'length');
  if (
    typeof length !== 'number' ||
    !Number.isSafeInteger(length) ||
    length < 0 ||
    length > 0xffffffff
  )
    return [];
  if (length > MAX_TABLE_ACTIONS) {
    throw new RangeError(
      `Table action list exceeds the ${MAX_TABLE_ACTIONS}-entry limit`,
    );
  }
  const actions: TableAction[] = [];
  for (let index = 0; index < length; index += 1) {
    const candidate = ownValue(value, String(index));
    const title = ownValue(candidate, 'title');
    const rawUrl = ownValue(candidate, 'url');
    const url = safeUrl(rawUrl);
    // Keep the original empty-link fallback, but drop unsafe or malformed URLs.
    if (
      (title !== undefined && typeof title !== 'string') ||
      (rawUrl != null && rawUrl !== '' && url === undefined)
    ) {
      continue;
    }
    if (candidate === null || typeof candidate !== 'object') {
      continue;
    }
    const target = ownValue(candidate, 'target');
    const icon = ownValue(candidate, 'icon');
    // Never spread the source object across the client-component boundary.
    actions.push({
      title,
      url,
      target: typeof target === 'string' ? target : undefined,
      icon: typeof icon === 'string' ? icon : undefined,
    });
  }
  return actions;
}

export function timeValue(value: unknown): string | number | Date | undefined {
  if (typeof value === 'string' || typeof value === 'number') return value;
  try {
    // The native Date brand check accepts cross-realm Dates and avoids custom
    // getters/coercion. Invalid dates retain Moment's original display.
    return new Date(Date.prototype.getTime.call(value));
  } catch {
    return undefined;
  }
}
