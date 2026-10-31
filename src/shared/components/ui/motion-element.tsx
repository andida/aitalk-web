"use client";

import { motion, type MotionProps } from "motion/react";
import {
  forwardRef,
  useState,
  type CSSProperties,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";

type CustomElementProps = {
  component: ElementType;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

// Create the motion component once. Changing `component` is ordinary React
// reconciliation, and rerendering an unchanged component preserves its state.
const CustomElement = forwardRef<Element, CustomElementProps>(
  function CustomElement({ component: Component, ...props }, ref) {
    return <Component {...props} ref={ref} />;
  }
);
const MotionCustomElement = motion.create(CustomElement);

// These React SVG tags are accepted by Motion's factory but absent from the
// native-property typings in the pinned Motion 12.23.12 release.
const additionalMotionTags = {
  animateMotion: motion.create("animateMotion"),
  animateTransform: motion.create("animateTransform"),
  mpath: motion.create("mpath"),
  set: motion.create("set"),
};

function isAdditionalMotionTag(
  tag: keyof JSX.IntrinsicElements
): tag is keyof typeof additionalMotionTags {
  return Object.prototype.hasOwnProperty.call(additionalMotionTags, tag);
}

type MotionElementProps = MotionProps & {
  as: ElementType;
  children?: ReactNode;
  className?: string;
};

function CustomMotionElement({ as, ...props }: MotionElementProps) {
  const [identity, setIdentity] = useState({ component: as, version: 0 });
  if (identity.component !== as) {
    // A genuinely different host should restart its motion lifecycle. This is
    // instance-local prop-derived state, not a cache of dynamically made types.
    setIdentity({ component: as, version: identity.version + 1 });
  }

  return (
    <MotionCustomElement
      key={identity.version}
      component={as}
      {...props}
    />
  );
}

export function MotionElement({ as, ...props }: MotionElementProps) {
  if (typeof as === "string") {
    // Motion owns stable components for native tags, including its SVG renderer.
    const MotionTag = isAdditionalMotionTag(as)
      ? additionalMotionTags[as]
      : motion[as];
    return <MotionTag {...props} />;
  }

  return <CustomMotionElement as={as} {...props} />;
}
