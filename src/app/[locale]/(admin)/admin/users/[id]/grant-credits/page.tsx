import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { initialFieldValue } from '@/shared/blocks/form/value';
import { readFormContextString, readFormString } from '@/shared/lib/form-action';
import { grantCreditsForUser } from '@/shared/models/credit';
import { findUserById, getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function UserGrantCreditsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Check if user has permission to edit posts
  await requirePermission({
    code: PERMISSIONS.USERS_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const user = await findUserById(id);
  if (!user) {
    return <Empty message="User not found" />;
  }

  const t = await getTranslations('admin.users');

  const crumbs: Crumb[] = [
    { title: t('grant_credits.crumbs.admin'), url: '/admin' },
    { title: t('grant_credits.crumbs.users'), url: '/admin/users' },
    { title: t('grant_credits.crumbs.grant_credits'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'name',
        type: 'text',
        title: t('fields.name'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'email',
        type: 'text',
        title: t('fields.email'),
        validation: { required: true },
        attributes: { disabled: true },
      },
      {
        name: 'credits',
        type: 'number',
        title: t('grant_credits.fields.credits'),
        placeholder: '0',
        validation: { required: true },
      },
      {
        name: 'valid_days',
        type: 'number',
        placeholder: '0',
        title: t('grant_credits.fields.valid_days'),
        tip: t('grant_credits.fields.valid_days_tip'),
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('grant_credits.fields.description'),
        placeholder: t('grant_credits.fields.description_placeholder'),
      },
    ],
    passby: {
      user: { id: user.id },
    },
    data: Object.fromEntries(
      ['name', 'email', 'credits', 'valid_days', 'description'].map((name) => [
        name,
        initialFieldValue(user, name),
      ])
    ),
    submit: {
      button: {
        title: t('grant_credits.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const actor = await getUserInfo();
        if (!actor) {
          throw new Error('no auth');
        }
        await requirePermission({
          code: PERMISSIONS.USERS_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });
        if (readFormContextString(passby, 'user', 'id') !== id) {
          throw new Error('invalid user context');
        }
        const user = await findUserById(id);
        if (!user || user.id !== id) {
          throw new Error('User not found');
        }

        const credits = parseInt(readFormString(data, 'credits') ?? '') || 0;
        const validDays = parseInt(readFormString(data, 'valid_days') ?? '') || 0;
        const description = readFormString(data, 'description');

        if (credits <= 0) {
          throw new Error('credits amount must be greater than 0');
        }

        await grantCreditsForUser({
          user: user,
          credits: credits,
          validDays: validDays > 0 ? validDays : 0,
          description: description ?? undefined,
        });

        return {
          status: 'success',
          message: 'credits granted successfully',
          redirect_url: `/admin/users?email=${user.email}`,
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('grant_credits.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
