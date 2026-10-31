import { respData, respErr } from '@/shared/lib/resp';
import { ChatStatus, getChats, getChatsCount } from '@/shared/models/chat';
import {
  getChatMessages,
  getChatMessagesCount,
} from '@/shared/models/chat_message';
import { getUserInfo } from '@/shared/models/user';

export async function POST(req: Request) {
  try {
    const {
      chatId,
      page: requestedPage,
      limit: requestedLimit,
    } = await req.json();
    let page = requestedPage;
    let limit = requestedLimit;
    if (!chatId) {
      return respErr('chatId is required');
    }

    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 30;
    }

    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const messages = await getChatMessages({
      userId: user.id,
      chatId,
      page,
      limit,
    });
    const total = await getChatMessagesCount({
      userId: user.id,
      chatId,
    });

    return respData({
      list: messages,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  } catch (e: unknown) {
    console.log('get chat messages failed:', e);
    return respErr(
      `get chat messages failed: ${e instanceof Error ? e.message : 'unknown error'}`
    );
  }
}
