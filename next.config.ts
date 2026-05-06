import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // CORS headers for the embeddable widget and response collection API
        source: "/api/responses/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Survey-Id",
          },
          { key: "Access-Control-Max-Age", value: "86400" },
        ],
      },
      {
        // CORS headers for the survey definition endpoint (widget fetches survey config)
        source: "/api/surveys/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, X-Survey-Id",
          },
        ],
      },
      {
        // Widget JS served with aggressive caching and CORS
        source: "/widget.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
          { key: "Content-Type", value: "application/javascript" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  org: "feedback-tool",
  project: "feedback-tool",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Configure sourcemaps
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
