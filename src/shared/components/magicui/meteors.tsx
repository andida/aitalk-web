"use client";

import { cn } from "@/shared/lib/utils";
import { usePrefersReducedMotion } from "@/shared/hooks/use-prefers-reduced-motion";
import React, { useCallback, useEffect, useRef } from "react";

interface MeteorsProps {
  number?: number;
  minDelay?: number;
  maxDelay?: number;
  minDuration?: number;
  maxDuration?: number;
  angle?: number;
  className?: string;
}

type MeteorSample = { position: number; delay: number; duration: number };

export const Meteors = ({
  number = 20,
  minDelay = 0.2,
  maxDelay = 1.2,
  minDuration = 2,
  maxDuration = 10,
  angle = 215,
  className,
}: MeteorsProps) => {
  const reducedMotion = usePrefersReducedMotion();
  const samples = useRef(new WeakMap<HTMLSpanElement, MeteorSample>());
  const nodes = useRef(new Set<HTMLSpanElement>());

  // Randomness belongs to DOM attachment, never to server/client rendering.
  // Keep each node's sample through ref replay and parameter changes.
  const attachMeteor = useCallback(
    (node: HTMLSpanElement | null) => {
      if (!node) return;
      let sample = samples.current.get(node);
      if (!sample) {
        sample = {
          position: Math.random(),
          delay: Math.random(),
          duration: Math.random(),
        };
        samples.current.set(node, sample);
      }
      nodes.current.add(node);
      node.style.left = `calc(0% + ${Math.floor(sample.position * window.innerWidth)}px)`;
      node.style.animationDelay = `${sample.delay * (maxDelay - minDelay) + minDelay}s`;
      node.style.animationDuration = `${Math.floor(sample.duration * (maxDuration - minDuration) + minDuration)}s`;
      node.style.removeProperty("visibility");

      return () => {
        nodes.current.delete(node);
      };
    },
    [minDelay, maxDelay, minDuration, maxDuration]
  );

  useEffect(() => {
    const resize = () => {
      for (const node of nodes.current) {
        const sample = samples.current.get(node);
        if (sample) {
          node.style.left = `calc(0% + ${Math.floor(sample.position * window.innerWidth)}px)`;
        }
      }
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <>
      {!reducedMotion &&
        Array.from({ length: number }, (_, idx) => (
          // Meteor Head
          <span
            key={idx}
            ref={attachMeteor}
            aria-hidden="true"
            style={
              {
                "--angle": `${-angle}deg`,
                top: "-5%",
                visibility: "hidden",
              } as React.CSSProperties
            }
            className={cn(
              "pointer-events-none absolute size-0.5 rotate-[var(--angle)] animate-meteor rounded-full bg-zinc-500 shadow-[0_0_0_1px_#ffffff10]",
              className
            )}
          >
            {/* Meteor Tail */}
            <div className="pointer-events-none absolute top-1/2 -z-10 h-px w-[50px] -translate-y-1/2 bg-gradient-to-r from-zinc-500 to-transparent" />
          </span>
        ))}
    </>
  );
};
