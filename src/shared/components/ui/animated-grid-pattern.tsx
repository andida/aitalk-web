"use client";

import {
  ComponentPropsWithoutRef,
  useCallback,
  useId,
  useRef,
  useState,
} from "react";
import { motion } from "motion/react";

import { cn } from "@/shared/lib/utils";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";

type Square = { id: number; pos: [number, number]; revision: number };

type GridLayout = {
  node: SVGSVGElement;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
  count: number;
};

function randomPosition(layout: GridLayout): [number, number] {
  return [
    Math.floor((Math.random() * layout.width) / layout.cellWidth),
    Math.floor((Math.random() * layout.height) / layout.cellHeight),
  ];
}

export interface AnimatedGridPatternProps
  extends ComponentPropsWithoutRef<"svg"> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: ComponentPropsWithoutRef<"svg">["strokeDasharray"];
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

export function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = useId();
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<SVGSVGElement | null>(null);
  const layoutRef = useRef<GridLayout | null>(null);
  const revisionRef = useRef(0);
  const [squares, setSquares] = useState<Square[]>([]);

  // This public prop was historically ignored. Do not leak it onto the SVG
  // or change its animation meaning without the missing callers' contract.
  void repeatDelay;

  const attachContainer = useCallback(
    (node: SVGSVGElement | null) => {
      if (!node) return;
      containerRef.current = node;
      let active = true;

      const measure = (size: { width: number; height: number }) => {
        if (!active) return;
        const previous = layoutRef.current;
        if (
          previous?.node === node &&
          previous.width === size.width &&
          previous.height === size.height &&
          previous.cellWidth === width &&
          previous.cellHeight === height &&
          previous.count === numSquares
        ) {
          return;
        }

        const layout = {
          node,
          width: size.width,
          height: size.height,
          cellWidth: width,
          cellHeight: height,
          count: numSquares,
        };
        layoutRef.current = layout;
        const revision = ++revisionRef.current;
        const hasArea =
          size.width > 0 &&
          size.height > 0 &&
          Number.isFinite(width) &&
          width > 0 &&
          Number.isFinite(height) &&
          height > 0;
        setSquares(
          hasArea
            ? Array.from({ length: numSquares }, (_, index) => ({
                id: index,
                pos: randomPosition(layout),
                revision,
              }))
            : []
        );
      };

      // Callback refs run on attachment and whenever the cell/count props
      // change; ResizeObserver owns subsequent container size changes.
      const resize = () => measure(node.getBoundingClientRect());
      const observer =
        typeof ResizeObserver === "undefined"
          ? null
          : new ResizeObserver((entries) => {
              for (const entry of entries) {
                if (entry.target === node) measure(entry.contentRect);
              }
            });
      observer?.observe(node);
      resize();
      if (!observer) window.addEventListener("resize", resize);

      return () => {
        active = false;
        observer?.disconnect();
        if (!observer) window.removeEventListener("resize", resize);
        if (containerRef.current === node) containerRef.current = null;
      };
    },
    [width, height, numSquares]
  );

  // Function to update a single square's position
  const updateSquarePosition = (id: number, revision: number) => {
    const layout = layoutRef.current;
    if (!containerRef.current || !layout || reducedMotion) return;
    const pos = randomPosition(layout);
    const nextRevision = ++revisionRef.current;
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id && sq.revision === revision
          ? {
              ...sq,
              pos,
              revision: nextRevision,
            }
          : sq
      )
    );
  };

  return (
    <svg
      ref={attachContainer}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {!reducedMotion &&
          squares.map(({ pos: [x, y], id, revision }, index) => (
            <motion.rect
              initial={{ opacity: 0 }}
              animate={{ opacity: maxOpacity }}
              transition={{
                duration,
                repeat: 1,
                delay: index * 0.1,
                repeatType: "reverse",
              }}
              onAnimationComplete={() => updateSquarePosition(id, revision)}
              key={`${id}-${revision}`}
              width={width - 1}
              height={height - 1}
              x={x * width + 1}
              y={y * height + 1}
              fill="currentColor"
              strokeWidth="0"
            />
          ))}
      </svg>
    </svg>
  );
}
