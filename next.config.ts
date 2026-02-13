import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Resolve .js imports to .ts source files (needed because server/ uses .js
    // extensions for Node.js ESM compatibility with module: "nodenext")
    config.resolve.extensionAlias = {
      ".js": [".ts", ".js"],
    };
    return config;
  },
};

export default nextConfig;
