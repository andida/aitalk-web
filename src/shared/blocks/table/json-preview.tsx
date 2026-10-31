import { scalarValue } from './value';

export function JsonPreview({
  value: suppliedValue,
  placeholder,
  className,
}: {
  value: unknown;
  placeholder?: string;
  metadata?: unknown;
  className?: string;
}) {
  const value = scalarValue(suppliedValue);
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  if (typeof value !== 'string') {
    return <div className={className}>{value}</div>;
  }

  let formatted: string | undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    formatted = JSON.stringify(parsed, null, 2);
  } catch {
    // Invalid JSON is displayed unchanged.
  }

  return formatted === undefined ? (
    <div className={className}>{value}</div>
  ) : (
    <pre className={className}>{formatted}</pre>
  );
}
