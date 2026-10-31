/**
 * Network JSON and open-ended provider options are untrusted. These guards only
 * validate fields consumed here; extra provider fields remain untouched.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requireRecord(
  value: unknown,
  message: string
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

export function readOptions(value: unknown): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  return requireRecord(value, 'invalid AI options: expected an object');
}

export function requiredString(value: unknown, message: string): string {
  if (typeof value !== 'string') {
    throw new Error(message);
  }
  return value;
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) {
    return false;
  }
  // Unlike every(), iteration also checks sparse slots passed by local callers.
  const items: unknown[] = value;
  for (const item of items) {
    if (typeof item !== 'string') {
      return false;
    }
  }
  return true;
}

export function stringArray(value: unknown, message: string): string[] {
  if (!isStringArray(value)) {
    throw new Error(message);
  }
  return value;
}

export function optionalString(
  value: unknown,
  message: string
): string | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  return requiredString(value, message);
}

export function optionalNumber(
  value: unknown,
  message: string
): number | null | undefined {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(message);
  }
  return value;
}

export function optionalErrorCode(
  value: unknown,
  message: string
): string | number | null | undefined {
  return typeof value === 'number'
    ? optionalNumber(value, message)
    : optionalString(value, message);
}

export function providerDate(value: unknown, message: string): Date {
  // Preserve legacy JSON.stringify behavior: missing/invalid dates become null,
  // while an explicit null timestamp becomes the epoch. Do not invent "now".
  if (value === undefined) {
    return new Date(Number.NaN);
  }
  if (value === null) {
    return new Date(0);
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(message);
  }
  return new Date(value);
}
