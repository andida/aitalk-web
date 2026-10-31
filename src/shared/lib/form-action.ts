/** Read a scalar context value without treating client-supplied context as auth. */
export function readFormContextString(
  context: unknown,
  ...path: string[]
): string | undefined {
  let value = context;
  for (const name of path) {
    if (
      typeof value !== 'object' ||
      value === null ||
      Array.isArray(value) ||
      !Object.prototype.hasOwnProperty.call(value, name)
    ) {
      return undefined;
    }
    // The property was checked above; its value is still untrusted.
    value = Object.getOwnPropertyDescriptor(value, name)?.value;
  }
  return typeof value === 'string' ? value : undefined;
}

/** Keep missing values and string contents intact, but never accept a File. */
export function readFormString(data: FormData, name: string): string | null {
  const value = data.get(name);
  if (value === null || typeof value === 'string') {
    return value;
  }
  throw new Error(`${name} must be a string`);
}

/** Parse the checkbox wire format without trusting JSON shape or changing IDs. */
export function readFormStringArray(data: FormData, name: string): string[] {
  const value = data.get(name);
  if (typeof value !== 'string') {
    throw new Error(`invalid ${name}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error(`invalid ${name}`);
  }
  if (
    !Array.isArray(parsed) ||
    !parsed.every((item: unknown) => typeof item === 'string')
  ) {
    throw new Error(`invalid ${name}`);
  }
  return parsed;
}
