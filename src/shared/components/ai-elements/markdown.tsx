"use client";

import { cn } from "@/shared/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { memo } from "react";

type MarkdownProps = ComponentProps<"div"> & {
  children?: ReactNode;
};

type MarkdownBlock =
  | { type: "code"; content: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "quote"; lines: string[] }
  | { type: "paragraph"; lines: string[] };

function toText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(toText).join("");
  }

  return "";
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.match(/^```\s*\S*\s*$/)) {
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({ type: "code", content: codeLines.join("\n") });
      continue;
    }

    const orderedMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    const unorderedMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (orderedMatch || unorderedMatch) {
      const ordered = Boolean(orderedMatch);
      const items: string[] = [];

      while (index < lines.length) {
        const current = lines[index];
        const match = ordered
          ? current.match(/^\s*\d+\.\s+(.+)$/)
          : current.match(/^\s*[-*]\s+(.+)$/);

        if (!match) {
          break;
        }

        items.push(match[1]);
        index += 1;
      }

      blocks.push({ type: "list", ordered, items });
      continue;
    }

    if (line.trimStart().startsWith(">")) {
      const quoteLines: string[] = [];

      while (
        index < lines.length &&
        lines[index].trimStart().startsWith(">")
      ) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
        index += 1;
      }

      blocks.push({ type: "quote", lines: quoteLines });
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim()) {
      if (
        lines[index].match(/^```/) ||
        lines[index].match(/^\s*\d+\.\s+/) ||
        lines[index].match(/^\s*[-*]\s+/) ||
        lines[index].trimStart().startsWith(">")
      ) {
        break;
      }

      paragraphLines.push(lines[index]);
      index += 1;
    }

    if (paragraphLines.length === 0) {
      paragraphLines.push(lines[index]);
      index += 1;
    }

    blocks.push({ type: "paragraph", lines: paragraphLines });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];
    if (value.startsWith("`")) {
      nodes.push(
        <code
          className="rounded bg-muted px-1 py-0.5 font-mono text-[0.92em]"
          key={`${match.index}-code`}
        >
          {value.slice(1, -1)}
        </code>
      );
    } else if (value.startsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-strong`}>{value.slice(2, -2)}</strong>
      );
    } else {
      const linkMatch = value.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (linkMatch) {
        nodes.push(
          <a
            className="underline underline-offset-4"
            href={linkMatch[2]}
            key={`${match.index}-link`}
            rel="noreferrer"
            target="_blank"
          >
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + value.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export const Markdown = memo(
  ({ children, className, ...props }: MarkdownProps) => {
    const content = toText(children);
    const blocks = parseMarkdown(content);

    return (
      <div
        className={cn(
          "size-full space-y-3 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
          className
        )}
        {...props}
      >
        {blocks.map((block, index) => {
          if (block.type === "code") {
            return (
              <pre
                className="overflow-x-auto rounded-md bg-muted p-3 text-xs"
                key={index}
              >
                <code>{block.content}</code>
              </pre>
            );
          }

          if (block.type === "list") {
            const List = block.ordered ? "ol" : "ul";

            return (
              <List
                className={cn(
                  "space-y-1 pl-5",
                  block.ordered ? "list-decimal" : "list-disc"
                )}
                key={index}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInline(item)}</li>
                ))}
              </List>
            );
          }

          if (block.type === "quote") {
            return (
              <blockquote
                className="border-l-2 border-border pl-3 text-muted-foreground"
                key={index}
              >
                {block.lines.map((quoteLine, lineIndex) => (
                  <p key={lineIndex}>{renderInline(quoteLine)}</p>
                ))}
              </blockquote>
            );
          }

          return (
            <p className="whitespace-pre-wrap" key={index}>
              {renderInline(block.lines.join("\n"))}
            </p>
          );
        })}
      </div>
    );
  }
);

Markdown.displayName = "Markdown";
