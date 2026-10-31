'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { UIMessage } from 'ai';

import { ChatBox } from '@/shared/blocks/chat/box';
import { Loader } from '@/shared/components/ai-elements/loader';
import { Chat } from '@/shared/types/chat';

type ApiResponse<T> = {
  code: number;
  message?: string;
  data?: T;
};

type ChatPayload = {
  id?: string;
  title?: string;
  createdAt?: string;
  model?: string;
  provider?: string;
  parts?: string;
  metadata?: string;
  content?: string;
};

type MessagePayload = {
  id?: string;
  role?: UIMessage['role'];
  parts?: string;
  metadata?: string;
};

function readJson(value: string | undefined) {
  if (!value) return undefined;
  return JSON.parse(value) as unknown;
}

export default function ChatPage() {
  const params = useParams();

  const [initialChat, setInitialChat] = useState<Chat | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(
    null
  );

  const fetchChat = async (chatId: string) => {
    try {
      const resp = await fetch('/api/chat/info', {
        method: 'POST',
        body: JSON.stringify({ chatId }),
      });
      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }
      const { code, message, data } = (await resp.json()) as ApiResponse<ChatPayload>;
      if (code !== 0 || !data?.id) {
        throw new Error(message);
      }

      setInitialChat({
        id: data.id,
        title: data.title ?? '',
        createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        model: data.model ?? '',
        provider: data.provider ?? '',
        parts: readJson(data.parts) ?? [],
        metadata: readJson(data.metadata),
        content: readJson(data.content),
      });

      if (data.id) {
        fetchMessages(data.id);
      }
    } catch (e: unknown) {
      console.log('fetch chat failed:', e);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      const resp = await fetch('/api/chat/messages', {
        method: 'POST',
        body: JSON.stringify({ chatId, page: 1, limit: 100 }),
      });
      if (!resp.ok) {
        throw new Error(`request failed with status: ${resp.status}`);
      }
      const { code, message, data } = (await resp.json()) as ApiResponse<{
        list?: MessagePayload[];
      }>;
      if (code !== 0) {
        throw new Error(message);
      }

      const list = data?.list ?? [];
      setInitialMessages(
        list.flatMap((item) => {
          if (!item.id || !item.role) return [];
          return [
            {
              id: item.id,
              role: item.role,
              parts: readJson(item.parts) ?? [],
              metadata: readJson(item.metadata),
            } as UIMessage,
          ];
        })
      );
    } catch (e: unknown) {
      console.log('fetch messages failed:', e);
    }
  };

  useEffect(() => {
    const chatId = typeof params.id === 'string' ? params.id : '';
    if (!chatId) return;
    const timer = window.setTimeout(() => {
      void fetchChat(chatId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  return initialChat && initialMessages ? (
    <ChatBox initialChat={initialChat} initialMessages={initialMessages} />
  ) : (
    <div className="flex h-screen items-center justify-center p-8">
      <Loader />
    </div>
  );
}
