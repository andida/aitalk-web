'use client';

import type { ReactNode } from 'react';
import copy from 'copy-to-clipboard';
import { CopyIcon } from 'lucide-react';
import { toast } from 'sonner';

import type { CopyMetadata } from '@/shared/types/blocks/table';

import { ownValue } from './value';

export function Copy({
  value,
  metadata,
  className,
  children,
}: {
  value: string;
  placeholder?: string;
  metadata?: CopyMetadata;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex cursor-pointer items-center gap-2 ${className || ''}`}
      onClick={() => {
        const message = ownValue(metadata, 'message');
        if (copy(value)) {
          toast.success(typeof message === 'string' ? message : 'Copied');
        } else {
          toast.error('Could not copy');
        }
      }}
    >
      {children}
      <CopyIcon className="h-3 w-3" />
    </button>
  );
}
