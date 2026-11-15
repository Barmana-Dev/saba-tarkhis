import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { useInView } from "../lib/useInView";

/** Fades/slides content in the first time it enters the viewport. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("reveal", inView && "is-visible", className)}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

/**
 * Defers mounting (and therefore data fetching) of a section until the user
 * approaches it. `minHeight` reserves space so the page does not jump.
 */
export function LazySection({
  children,
  className,
  minHeight = 320,
  id,
}: {
  children: ReactNode;
  className?: string;
  minHeight?: number;
  id?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>("600px");

  return (
    <div
      ref={ref}
      id={id}
      className={className}
      style={inView ? undefined : { minHeight }}
      aria-busy={!inView || undefined}
    >
      {inView ? children : null}
    </div>
  );
}
