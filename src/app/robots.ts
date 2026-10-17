import type { MetadataRoute } from "next";

// De tracker is een besloten werkomgeving: niets hoeft in zoekmachines.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
