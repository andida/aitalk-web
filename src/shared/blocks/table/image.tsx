import { LazyImage } from '@/shared/blocks/common';
import { cn } from '@/shared/lib/utils';
import { imageSize } from './image-size';
import { ownValue, safeUrl } from './value';

export function Image({
  value: suppliedValue,
  metadata,
  placeholder,
  className,
}: {
  value: unknown;
  metadata?: unknown;
  placeholder?: string;
  className?: string;
}) {
  const value = safeUrl(suppliedValue);
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  const width = imageSize(ownValue(metadata, 'width'));
  const height = imageSize(ownValue(metadata, 'height'));

  return (
    <LazyImage
      src={value}
      alt={value}
      width={width}
      height={height}
      className={cn('shrink-0 rounded-md object-cover', className)}
    />
  );
}
