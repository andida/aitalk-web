import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { readFormContextString, readFormString } from '@/shared/lib/form-action';
import { getUserInfo } from '@/shared/models/user';
import { getRoleById, updateRole, UpdateRole } from '@/shared/services/rbac';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function RoleEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Check if user has permission to edit posts
  await requirePermission({
    code: PERMISSIONS.ROLES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const role = await getRoleById(id);
  if (!role) {
    return <Empty message="Role not found" />;
  }

  const t = await getTranslations('admin.roles');

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.roles'), url: '/admin/roles' },
    { title: t('edit.crumbs.edit'), is_active: true },
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
        name: 'title',
        type: 'text',
        title: t('fields.title'),
        validation: { required: true },
      },
      {
        name: 'description',
        type: 'textarea',
        title: t('fields.description'),
        validation: { required: true },
      },
    ],
    passby: {
      role: { id },
    },
    data: { name: role.name, title: role.title, description: role.description },
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const operator = await getUserInfo();
        if (!operator) {
          throw new Error('no auth');
        }
        await requirePermission({
          code: PERMISSIONS.ROLES_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });

        if (readFormContextString(passby, 'role', 'id') !== id) {
          throw new Error('invalid role context');
        }
        const role = await getRoleById(id);
        if (!role || role.id !== id) {
          throw new Error('Role not found');
        }

        const title = readFormString(data, 'title');
        const description = readFormString(data, 'description');
        if (title === null) {
          throw new Error('title is required');
        }

        const newRole: UpdateRole = {
          title: title.trim(),
          description,
        };

        const result = await updateRole(role.id, newRole);

        if (!result) {
          throw new Error('update role failed');
        }

        return {
          status: 'success',
          message: 'role updated',
          redirect_url: '/admin/roles',
        };
      },
    },
  };

  return (
    <>
      <Header crumbs={crumbs} />
      <Main>
        <MainHeader title={t('edit.title')} />
        <FormCard form={form} className="md:max-w-xl" />
      </Main>
    </>
  );
}
