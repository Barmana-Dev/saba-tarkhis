/** Photo used for each service, keyed by its slug. */
const imageBySlug: Record<string, string> = {
  "clearance-from-customs": "/images/photos/services/clearance-from-customs.jpg",
  "customs-document-review": "/images/photos/services/customs-document-review.jpg",
  "order-registration-guidance": "/images/photos/services/order-registration-guidance.jpg",
  "import-export-guidance": "/images/photos/services/import-export-guidance.jpg",
  "hs-code-review": "/images/photos/services/hs-code-review.jpg",
  "transit-process-guidance": "/images/photos/services/transit-process-guidance.jpg",
};

const fallbackImage = "/images/photos/services-fallback.jpg";

export function serviceImage(slug: string): string {
  return imageBySlug[slug] ?? fallbackImage;
}
