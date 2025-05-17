import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
 
 
const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  webpack: (config, { isServer }) => {
    // Add TypeScript file extensions
    config.resolve.extensions.push(".ts", ".tsx");
    
    // Handle file system fallbacks
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      fs: false,
      path: false 
    };

    // Add onnxruntime-web alias
    config.resolve.alias = {
      ...config.resolve.alias,
      "onnxruntime-web/all": path.join(__dirname, 'node_modules/onnxruntime-web/dist/ort.all.bundle.min.mjs'),
      "sharp$": false,
      "onnxruntime-node$": false,
    };

    // Only apply these configurations to client-side builds
    if (!isServer) {
      // Handle WASM files - ensure they're correctly loaded
      config.module = config.module || {};
      config.module.rules = config.module.rules || [];
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
        generator: {
          filename: 'static/[hash][ext]'
        }
      });

      // Add onnxruntime-web WASM files to output
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true
      };
    }

    return config;
  },
  // Headers for WASM and SharedArrayBuffer usage
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);