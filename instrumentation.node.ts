import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

/**
 * OpenTelemetry tracing for the Node runtime.
 *
 * Configured manually rather than through @vercel/otel so the exporter
 * endpoint, the service name and the batching behaviour are all visible in
 * this repository instead of hidden behind a wrapper's defaults.
 *
 * Traces go to the OpenTelemetry Collector over OTLP/HTTP, and the collector
 * fans them out to Jaeger. Pointing the app straight at Jaeger would also
 * work, but routing through the collector is what makes the backend
 * replaceable without touching application code — which is the entire reason
 * for using OpenTelemetry rather than a vendor SDK.
 *
 * OTEL_EXPORTER_OTLP_ENDPOINT is read from the environment: "otel-collector"
 * inside Docker Compose, "localhost" when running npm run dev.
 */
const endpoint =
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318";

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "rss-server",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? "3.0.0",
  }),
  // Batched rather than simple: one HTTP request per span would add latency to
  // every feed poll, which is precisely what the load testing is measuring.
  spanProcessor: new BatchSpanProcessor(
    new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
  ),
});

sdk.start();

// Without this, spans still sitting in the batch queue are lost when the
// container is stopped — which is exactly when the interesting ones exist.
process.on("SIGTERM", () => {
  void sdk.shutdown().finally(() => process.exit(0));
});
