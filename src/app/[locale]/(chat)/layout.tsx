import { ReactNode } from 'react';
import type { Metadata } from 'next';

import { ChatLayoutClient } from './chat-layout-client';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default function ChatLayout({ children }: { children: ReactNode }) {
  return <ChatLayoutClient>{children}</ChatLayoutClient>;
}
