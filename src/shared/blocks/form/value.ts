/** A renderer may display a safe value without changing the raw value that Zod validates. */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function inputValue(value: unknown): string | number {
  return typeof value === 'string' || typeof value === 'number' ? value : '';
}

export function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function initialFieldValue(data: unknown, name: string): unknown {
  if (
    typeof data !== 'object' ||
    data === null ||
    Array.isArray(data) ||
    !Object.prototype.hasOwnProperty.call(data, name)
  ) {
    return undefined;
  }
  // Reading a data property does not establish a type or invoke a getter.
  const value: unknown = Object.getOwnPropertyDescriptor(data, name)?.value;
  return value;
}
