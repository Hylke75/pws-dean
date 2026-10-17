import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Persoonlijke interviewpagina's nooit indexeren of cachen.
  async headers() {
    return [
      {
        source: "/interview/:token*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
