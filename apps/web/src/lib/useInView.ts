import { useEffect, useRef, useState } from "react";

/**
 * Observes an element and flips to `true` once it is close to the viewport.
 * Starts visible when IntersectionObserver is unavailable, so content never
 * stays hidden in an environment without it.
 */
export function useInView<T extends HTMLElement>(rootMargin = "140px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === "undefined");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.05 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}
