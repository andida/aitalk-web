import { Link } from '@/core/i18n/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { cn } from '@/shared/lib/utils';

import { userValue } from './value';

export function User({
  value: suppliedValue,
  placeholder,
  className,
}: {
  value: unknown;
  placeholder?: string;
  metadata?: unknown;
  className?: string;
}) {
  const value = userValue(suppliedValue);
  if (!value) {
    if (placeholder) {
      return <div className={className}>{placeholder}</div>;
    }

    return null;
  }

  return (
    <Link
      href={`/admin/users?email=${encodeURIComponent(value.email)}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn('flex items-center gap-2', className)}
    >
      <Avatar className={className}>
        <AvatarImage src={value.image || ''} alt={value.name} />
        <AvatarFallback>{value.name?.charAt(0) || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">{value.name}</div>
    </Link>
  );
}
