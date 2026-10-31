import { safeUrl } from '@/shared/blocks/table/value';

type Song = {
  id?: string | number;
  audioUrl: string;
  title?: string;
};

type Image = { imageUrl: string };

export type AITaskTableDisplay =
  | { kind: 'error'; message: string }
  | { kind: 'songs'; items: Song[] }
  | { kind: 'images'; items: Image[] }
  | { kind: 'empty' };

function field(value: unknown, key: string): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }

  // Parser output is data. Do not invoke accessors or copy extra properties
  // into the props sent to the audio/image components.
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

export function narrowAITaskTableDisplay(value: unknown): AITaskTableDisplay {
  try {
    const kind = field(value, 'kind');
    if (kind === 'error') {
      const message = field(value, 'message');
      return typeof message === 'string'
        ? { kind, message }
        : { kind: 'empty' };
    }

    const items = field(value, 'items');
    if (!Array.isArray(items)) {
      return { kind: 'empty' };
    }

    const length: unknown = Object.getOwnPropertyDescriptor(
      items,
      'length',
    )?.value;
    if (
      typeof length !== 'number' ||
      !Number.isSafeInteger(length) ||
      length < 0
    ) {
      return { kind: 'empty' };
    }
    const dataItems: unknown[] = [];
    for (let index = 0; index < length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(items, String(index));
      if (descriptor && 'value' in descriptor) {
        dataItems.push(descriptor.value);
      }
    }

    if (kind === 'songs') {
      const songs: Song[] = [];
      for (const item of dataItems) {
        const audioUrl = safeUrl(field(item, 'audioUrl'));
        if (audioUrl === undefined) continue;
        const id = field(item, 'id');
        const title = field(item, 'title');
        songs.push({
          audioUrl,
          ...(typeof id === 'string' ||
          (typeof id === 'number' && Number.isFinite(id))
            ? { id }
            : {}),
          ...(typeof title === 'string' ? { title } : {}),
        });
      }
      return { kind, items: songs };
    }

    if (kind === 'images') {
      const images: Image[] = [];
      for (const item of dataItems) {
        const imageUrl = safeUrl(field(item, 'imageUrl'));
        if (imageUrl !== undefined) images.push({ imageUrl });
      }
      return { kind, items: images };
    }
  } catch {
    // Malformed parser output must not abort the rest of the table.
  }

  return { kind: 'empty' };
}
