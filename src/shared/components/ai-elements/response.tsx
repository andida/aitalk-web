"use client";

import { cn } from "@/shared/lib/utils";
import { type ComponentProps, memo } from "react";
import { Markdown } from "./markdown";

type ResponseProps = ComponentProps<typeof Markdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Markdown
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        className
      )}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
