import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  webpack: (config) => {
    // Configure webpack to handle ONNX Runtime WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });
    
    return config;
  },
  // Add headers to allow WASM and SharedArrayBuffer usage
  async headers() {
    return [
      {
        source: "/(.*)",
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
export default nextConfig;