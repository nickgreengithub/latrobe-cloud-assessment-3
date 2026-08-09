import type { NextConfig } from "next";

/**
 * Two build targets.
 *
 * `BUILD_TARGET=static` produces the Assessment 1 static export for GitHub
 * Pages — no server, no API. GitHub Pages serves this project site under
 * /<repo>, so the base path is applied for production builds only.
 *
 * The default is the Assessment 2 server build — a normal Next.js server build
 * started with `next start`, which is what the Docker image runs. A static
 * export cannot run Route Handlers at all, so the API only exists in this
 * second target.
 */
const repoBasePath = "/latrobe-cloud-applications";
const isStatic = process.env.BUILD_TARGET === "static";
const isProd = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = isStatic
  ? {
      output: "export",
      basePath: isProd ? repoBasePath : undefined,
      trailingSlash: true,
      images: { unoptimized: true },
    }
  : {
      images: { unoptimized: true },
    };

export default nextConfig;
