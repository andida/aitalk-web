type MediaKind = 'image' | 'video';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function parseMediaTaskResult(
  value: string | null
): Record<string, unknown> | null {
  if (!value) return null;
  try {
    return asRecord(JSON.parse(value) as unknown);
  } catch (error) {
    console.warn('Failed to parse taskResult:', error);
    return null;
  }
}

function mediaUrl(value: unknown, kind: MediaKind): string | null {
  if (typeof value === 'string') return value || null;
  const record = asRecord(value);
  if (!record) return null;
  const candidate =
    record.url ??
    record.uri ??
    record[kind] ??
    record.src ??
    record[`${kind}Url`];
  return typeof candidate === 'string' && candidate ? candidate : null;
}

export function extractMediaUrls(
  result: Record<string, unknown> | null,
  kind: MediaKind
): string[] {
  if (!result) return [];
  const output =
    kind === 'video' && Array.isArray(result.videos)
      ? result.videos
      : (result.output ??
        (kind === 'image' ? result.images : result.video) ??
        result.data);
  const values = Array.isArray(output) ? output : [output];
  return values
    .map((item) => mediaUrl(item, kind))
    .filter((url): url is string => url !== null);
}
