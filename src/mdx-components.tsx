import React from 'react';
import type { MDXComponents } from 'mdx/types';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import { cn } from '@/shared/lib/utils';

// Custom link component with nofollow for external links
const CustomLink = ({
  href,
  children,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
  // Check if the link is external
  const isExternal = href?.startsWith('http') || href?.startsWith('//');

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="text-primary"
        {...props}
      >
        {children}
      </a>
    );
  }

  // Internal links
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
};

type RelativeLinkSource = {
  getPageByHref?: (
    href: string,
    options: { dir?: string; language?: string }
  ) =>
    | {
        hash?: string;
        page: { url: string };
      }
    | undefined;
};

type RelativeLinkPage = {
  path?: string;
  locale?: string;
};

function dirname(filePath?: string) {
  if (!filePath) return '';

  const normalizedPath = filePath.replaceAll('\\', '/');
  const lastSeparator = normalizedPath.lastIndexOf('/');

  return lastSeparator === -1 ? '' : normalizedPath.slice(0, lastSeparator);
}

export function createRelativeLink(
  source: RelativeLinkSource,
  page: RelativeLinkPage,
  LinkComponent: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  > = CustomLink
) {
  return function RelativeLink({
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
    let resolvedHref = href;

    if (href?.startsWith('.') && source.getPageByHref) {
      const target = source.getPageByHref(href, {
        dir: dirname(page.path),
        language: page.locale ?? undefined,
      });

      if (target) {
        resolvedHref = target.hash
          ? `${target.page.url}#${target.hash}`
          : target.page.url;
      }
    }

    return <LinkComponent href={resolvedHref} {...props} />;
  };
}

// Higher-order component to wrap any link component with nofollow logic
export function withNoFollow(
  LinkComponent: React.ComponentType<
    React.AnchorHTMLAttributes<HTMLAnchorElement>
  >
) {
  return ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // Check if the link is external
    const isExternal = href?.startsWith('http') || href?.startsWith('//');

    if (isExternal) {
      // For external links, add nofollow and pass through to the wrapped component
      return (
        <LinkComponent
          href={href}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="text-primary"
          {...props}
        >
          {children}
        </LinkComponent>
      );
    }

    // For internal links, just use the wrapped component as-is
    return (
      <LinkComponent href={href} {...props}>
        {children}
      </LinkComponent>
    );
  };
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  const mergedComponents = {
    a: CustomLink,
    table: (props: React.ComponentProps<'table'>) => (
      <div className="relative my-6 overflow-auto">
        <table {...props} />
      </div>
    ),
    pre: (props: React.ComponentProps<'pre'>) => (
      <pre
        {...props}
        className={cn(
          'my-6 overflow-x-auto rounded-lg border bg-muted p-4 text-sm',
          props.className
        )}
      />
    ),
    code: (props: React.ComponentProps<'code'>) => (
      <code
        {...props}
        className={cn(
          'rounded bg-muted px-1 py-0.5 font-mono text-sm',
          props.className
        )}
      />
    ),
    img: (props: React.ComponentProps<'img'>) => {
      const { src } = props;
      // If src is an object (imported image), use its src property
      const imageSrc =
        typeof src === 'object' && src !== null && 'src' in src
          ? (src as any).src
          : src;

      return (
        <img
          {...props}
          src={imageSrc}
          className={cn('rounded-lg border', props.className)}
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      );
    },
    Video: ({ className, ...props }: React.ComponentProps<'video'>) => (
      <video
        className={cn('rounded-md border', className)}
        controls
        loop
        {...props}
      />
    ),
    Accordion,
    AccordionItem,
    AccordionTrigger,
    AccordionContent,
    ...components,
  };

  // If a custom 'a' component is provided, wrap it with nofollow logic
  if (components?.a && components.a !== CustomLink) {
    mergedComponents.a = withNoFollow(
      components.a as React.ComponentType<
        React.AnchorHTMLAttributes<HTMLAnchorElement>
      >
    );
  }

  return mergedComponents;
}

export const useMDXComponents = getMDXComponents;
