/**
 * Next.js instrumentation hook — runs once, before any application code, in
 * each server environment.
 *
 * This file must sit at the project root, NOT inside app/. Next only looks for
 * it here, and a copy under app/api/ silently does nothing: the collector
 * receives no traces and the service never appears in Jaeger.
 *
 * The OpenTelemetry Node SDK is imported dynamically and only for the Node
 * runtime. It depends on Node built-ins that do not exist on the Edge runtime,
 * so a top-level import would break the build for every environment.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
