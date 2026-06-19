import { normalizeDomain } from '@/features/traffic/domain';

import { getDomainDetailView } from '@/shared/models/siterise';
import { getUserInfo } from '@/shared/models/user';

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ domain: string }> }
) {
  try {
    const { domain } = await params;
    const normalized = normalizeDomain(decodeURIComponent(domain));
    const user = await getOptionalUser();
    const detail = await getDomainDetailView({
      rootDomain: normalized.rootDomain,
      isAuthenticated: Boolean(user),
    });

    if (!detail) {
      return json(
        {
          code: -1,
          message: 'Domain was not found in the current dataset.',
          error: 'not_found',
        },
        404
      );
    }

    return json({
      code: 0,
      message: 'ok',
      data: {
        input: normalized.input,
        ...detail,
      },
    });
  } catch (error) {
    return json(
      {
        code: -1,
        message:
          error instanceof Error ? error.message : 'Domain request failed.',
        error: 'invalid_request',
      },
      400
    );
  }
}

async function getOptionalUser() {
  try {
    return await getUserInfo();
  } catch {
    return null;
  }
}
