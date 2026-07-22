import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Export as fully static site
  output: "export",
  // Note: Custom headers are not supported with output: 'export'
};

export default withNextIntl(nextConfig);
