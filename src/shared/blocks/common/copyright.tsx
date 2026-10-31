'use client';

import { useSyncExternalStore } from 'react';

import { envConfigs } from '@/config';
import { Brand as BrandType } from '@/shared/types/blocks/common';

const subscribe = () => () => {};
const getYear = () => new Date().getFullYear();
const getServerYear = () => 2024;

export function Copyright({ brand }: { brand: BrandType }) {
  const currentYear = useSyncExternalStore(subscribe, getYear, getServerYear);

  return (
    <div className={`text-muted-foreground text-sm`}>
      © {currentYear}{' '}
      <a
        href={brand?.url || envConfigs.app_url}
        target={brand?.target || ''}
        className="text-primary hover:text-primary/80 cursor-pointer"
      >
        {brand?.title || envConfigs.app_name}
      </a>
      , All rights reserved
    </div>
  );
}
