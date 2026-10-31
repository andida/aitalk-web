import { Badge } from '@/shared/components/ui/badge';

import { ownValue, scalarValue } from './value';

export function Label({
  value: suppliedValue,
  placeholder,
  metadata,
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

  const variant = ownValue(metadata, 'variant');
  const safeVariant =
    variant === 'default' ||
    variant === 'secondary' ||
    variant === 'destructive' ||
    variant === 'outline'
      ? variant
      : 'secondary';

  return (
    <Badge variant={safeVariant} className={className}>
      {value.toString()}
    </Badge>
  );
}
