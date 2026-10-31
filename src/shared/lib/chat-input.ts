import type { PromptInputMessage } from '@/shared/components/ai-elements/prompt-input';

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function jsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(jsonValue);
  return record(value) && Object.values(value).every(jsonValue);
}

function providerMetadata(value: unknown): boolean {
  return (
    record(value) &&
    Object.values(value).every(
      (provider) => record(provider) && Object.values(provider).every(jsonValue)
    )
  );
}

export function isPromptInputMessage(
  value: unknown
): value is PromptInputMessage {
  if (!record(value)) return false;
  if (value.text !== undefined && typeof value.text !== 'string') return false;
  if (value.files === undefined) return true;
  return (
    Array.isArray(value.files) &&
    value.files.every(
      (file: unknown) =>
        record(file) &&
        file.type === 'file' &&
        typeof file.mediaType === 'string' &&
        typeof file.url === 'string' &&
        (file.filename === undefined || typeof file.filename === 'string') &&
        (file.providerMetadata === undefined ||
          providerMetadata(file.providerMetadata))
    )
  );
}

export function parseChatRequestMetadata(
  value: unknown
): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value) as unknown;
    } catch {
      return {};
    }
  }
  return record(value) ? value : {};
}
