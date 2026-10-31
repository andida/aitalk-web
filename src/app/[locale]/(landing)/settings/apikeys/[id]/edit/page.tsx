import { getTranslations } from 'next-intl/server';

import { Empty } from '@/shared/blocks/common';
import { FormCard } from '@/shared/blocks/form';
import { readFormContextString, readFormString } from '@/shared/lib/form-action';
import {
  findApikeyById,
  updateApikey,
  UpdateApikey,
} from '@/shared/models/apikey';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form as FormType } from '@/shared/types/blocks/form';

export default async function EditApiKeyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apikey = await findApikeyById(id);
  if (!apikey) {
    return <Empty message="API key not found" />;
  }

  const user = await getUserInfo();
  if (!user) {
    return <Empty message="no auth" />;
  }

  if (apikey.userId !== user.id) {
    return <Empty message="no permission" />;
  }

  const t = await getTranslations('settings.apikeys');

  const form: FormType = {
    title: t('edit.title'),
    fields: [
      {
        name: 'title',
        title: t('fields.title'),
        type: 'text',
        placeholder: '',
        validation: { required: true },
      },
    ],
    passby: {
      user: { id: user.id },
      apikey: { id: apikey.id },
    },
    data: { title: apikey.title },
    submit: {
      handler: async (data: FormData, passby?: unknown) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }
        if (readFormContextString(passby, 'user', 'id') !== user.id) {
          throw new Error('no permission');
        }

        const apikeyId = readFormContextString(passby, 'apikey', 'id');
        if (!apikeyId) {
          throw new Error('apikey not found');
        }
        if (apikeyId !== id) {
          throw new Error('no permission');
        }
        const apikey = await findApikeyById(apikeyId);
        if (!apikey) {
          throw new Error('apikey not found');
        }
        if (apikey.userId !== user.id) {
          throw new Error('no permission');
        }

        const title = readFormString(data, 'title');
        if (!title?.trim()) {
          throw new Error('title is required');
        }

        const updatedApikey: UpdateApikey = {
          title: title.trim(),
        };

        await updateApikey(apikey.id, updatedApikey);

        return {
          status: 'success',
          message: 'API Key updated',
          redirect_url: '/settings/apikeys',
        };
      },
      button: {
        title: t('edit.buttons.submit'),
      },
    },
  };

  const crumbs: Crumb[] = [
    {
      title: t('edit.crumbs.apikeys'),
      url: '/settings/apikeys',
    },
    {
      title: t('edit.crumbs.edit'),
      is_active: true,
    },
  ];

  return (
    <div className="space-y-8">
      <FormCard title={t('edit.title')} crumbs={crumbs} form={form} />
    </div>
  );
}
