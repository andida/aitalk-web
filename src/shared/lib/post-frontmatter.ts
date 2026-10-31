import type { Category } from '@/shared/types/blocks/blog';

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function dateText(value: unknown): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }
  return text(value);
}

/** Read optional frontmatter fields without trusting MDX metadata types. */
export function readPostFrontmatter(value: unknown) {
  const data = record(value) ?? {};
  const categories: Category[] = Array.isArray(data.categories)
    ? data.categories.flatMap((item: unknown) => {
        const category = record(item);
        if (!category) return [];
        return [{
          id: text(category.id),
          slug: text(category.slug),
          title: text(category.title),
          description: text(category.description),
          image: text(category.image),
          url: text(category.url),
          target: text(category.target),
        }];
      })
    : [];
  return {
    created_at: dateText(data.created_at),
    date: dateText(data.date),
    author_name: text(data.author_name),
    author_image: text(data.author_image),
    image: text(data.image),
    version: text(data.version),
    tags: Array.isArray(data.tags)
      ? data.tags.filter((item: unknown): item is string => typeof item === 'string')
      : [],
    categories,
  };
}
