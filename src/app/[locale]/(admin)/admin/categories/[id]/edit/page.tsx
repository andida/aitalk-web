import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PERMISSIONS, requirePermission } from '@/core/rbac';
import { Empty } from '@/shared/blocks/common';
import { Header, Main, MainHeader } from '@/shared/blocks/dashboard';
import { FormCard } from '@/shared/blocks/form';
import { readFormContextString, readFormString } from '@/shared/lib/form-action';
import {
  findTaxonomy,
  TaxonomyStatus,
  updateTaxonomy,
  UpdateTaxonomy,
} from '@/shared/models/taxonomy';
import { getUserInfo } from '@/shared/models/user';
import { Crumb } from '@/shared/types/blocks/common';
import { Form } from '@/shared/types/blocks/form';

export default async function CategoryEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  // Check if user has permission to edit categories
  await requirePermission({
    code: PERMISSIONS.CATEGORIES_WRITE,
    redirectUrl: '/admin/no-permission',
    locale,
  });

  const t = await getTranslations('admin.categories');

  const category = await findTaxonomy({ id });
  if (!category) {
    return <Empty message="Category not found" />;
  }

  const crumbs: Crumb[] = [
    { title: t('edit.crumbs.admin'), url: '/admin' },
    { title: t('edit.crumbs.categories'), url: '/admin/categories' },
    { title: t('edit.crumbs.edit'), is_active: true },
  ];

  const form: Form = {
    fields: [
      {
        name: 'slug',
        type: 'text',
        title: t('fields.slug'),
        tip: 'unique slug for the category',
        validation: { required: true },
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
      },
    ],
    passby: {
      type: 'category',
      category: { id: category.id },
    },
    data: {
      slug: category.slug,
      title: category.title,
      description: category.description,
    },
    submit: {
      button: {
        title: t('edit.buttons.submit'),
      },
      handler: async (data, passby) => {
        'use server';

        const user = await getUserInfo();
        if (!user) {
          throw new Error('no auth');
        }

        await requirePermission({
          code: PERMISSIONS.CATEGORIES_WRITE,
          redirectUrl: '/admin/no-permission',
          locale,
        });

        if (readFormContextString(passby, 'category', 'id') !== id) {
          throw new Error('access denied');
        }
        const category = await findTaxonomy({ id });
        if (!category || category.id !== id || category.userId !== user.id) {
          throw new Error('access denied');
        }

        const slug = readFormString(data, 'slug');
        const title = readFormString(data, 'title');
        const description = readFormString(data, 'description');

        if (!slug?.trim() || !title?.trim()) {
          throw new Error('slug and title are required');
        }
        if (description === null) {
          throw new Error('invalid description');
        }

        const updateCategory: UpdateTaxonomy = {
          parentId: '', // todo: select parent category
          slug: slug.trim().toLowerCase(),
          title: title.trim(),
          description: description.trim(),
          image: '',
          icon: '',
          status: TaxonomyStatus.PUBLISHED,
        };

        const result = await updateTaxonomy(category.id, updateCategory);

        if (!result) {
          throw new Error('update category failed');
        }

        return {
          status: 'success',
          message: 'category updated',
          redirect_url: '/admin/categories',
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
