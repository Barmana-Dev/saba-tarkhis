/** Scrolls the window to the top, smoothly unless the user asked for less motion. */
export function scrollToTop(): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
}
