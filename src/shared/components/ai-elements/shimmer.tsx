"use client";

import { cn } from "@/shared/lib/utils";
import { MotionElement } from "@/shared/components/ui/motion-element";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import { MotionConfigContext, useAnimationControls } from "motion/react";
import {
  type CSSProperties,
  type ElementType,
  memo,
  useContext,
  useEffect,
  useMemo,
} from "react";

export type TextShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
  spread?: number;
};

const ShimmerComponent = ({
  children,
  as: Component = "p",
  className,
  duration = 2,
  spread = 2,
}: TextShimmerProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { reducedMotion } = useContext(MotionConfigContext);
  const reduceMotion =
    reducedMotion === "always" ||
    (reducedMotion === "user" && prefersReducedMotion);

  const controls = useAnimationControls();

  useEffect(() => {
    void controls.start({
      backgroundPosition: reduceMotion
        ? "50% center"
        : ["100% center", "0% center"],
      transition: reduceMotion
        ? { duration: 0 }
        : { repeat: Number.POSITIVE_INFINITY, duration, ease: "linear" },
    });
    return () => controls.stop();
  }, [controls, reduceMotion, duration, Component]);

  const dynamicSpread = useMemo(
    () => (children?.length ?? 0) * spread,
    [children, spread]
  );

  return (
    <MotionElement
      as={Component}
      animate={controls}
      className={cn(
        "relative inline-block bg-[length:250%_100%,auto] bg-clip-text text-transparent",
        "[--bg:linear-gradient(90deg,#0000_calc(50%-var(--spread)),var(--color-background),#0000_calc(50%+var(--spread)))] [background-repeat:no-repeat,padding-box]",
        className
      )}
      initial={{ backgroundPosition: "100% center" }}
      style={
        {
          "--spread": `${dynamicSpread}px`,
          backgroundImage:
            "var(--bg), linear-gradient(var(--color-muted-foreground), var(--color-muted-foreground))",
        } as CSSProperties
      }
    >
      {children}
    </MotionElement>
  );
};

export const Shimmer = memo(ShimmerComponent);
