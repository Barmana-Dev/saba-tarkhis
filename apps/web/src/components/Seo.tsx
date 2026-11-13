import { useEffect } from "react";

type SeoProps = {
  title: string;
  description: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown>;
};

const SITE_NAME = "صبا ترخیص";

function setMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

/**
 * Client-side metadata for the SPA. True social-crawler prerendering is a
 * documented limitation (see docs/decisions.md).
 */
export function Seo({ title, description, noindex, jsonLd }: SeoProps) {
  useEffect(() => {
    const fullTitle = title === SITE_NAME ? `${SITE_NAME} | خدمات ترخیص کالا و مشاوره گمرکی` : `${title} | ${SITE_NAME}`;
    document.title = fullTitle;
    setMeta("description", description);
    setMeta("robots", noindex ? "noindex, nofollow" : "index, follow");
    setMeta("og:title", fullTitle, "property");
    setMeta("og:description", description, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:locale", "fa_IR", "property");

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }

    return () => {
      if (script) script.remove();
    };
  }, [title, description, noindex, jsonLd]);

  return null;
}
