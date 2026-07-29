import type { NextConfig } from "next";

/**
 * Static export for GitHub Pages.
 * GitHub Pages serves this project site under /<repo>, so the base path is
 * applied for production builds only — `next dev` still runs at the root
 * locally. Assets, `next/link`, and `next/font` all inherit the base path.
 */
const repoBasePath = "/latrobe-cloud-applications";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? repoBasePath : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
