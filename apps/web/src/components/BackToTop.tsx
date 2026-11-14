import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { scrollToTop } from "../lib/scroll";

/**
 * Floating "back to top" control in the bottom-right corner. It fades in only
 * after the visitor has scrolled past the first screen, so it never covers the
 * hero content, and it is available on every page.
 */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      tabIndex={visible ? 0 : -1}
      aria-label="بازگشت به بالای صفحه"
      title="بازگشت به بالا"
      className={`fixed bottom-5 right-4 z-40 flex size-11 items-center justify-center rounded-full border border-white/15 bg-brand-800 text-white shadow-lg transition-all duration-300 ease-out hover:bg-brand-700 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
      }`}
    >
      <span aria-hidden className="flex">
        <ArrowUp className="size-5" />
      </span>
    </button>
  );
}
