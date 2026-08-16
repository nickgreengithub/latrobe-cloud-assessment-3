import { SpanStatusCode, trace, type Attributes } from "@opentelemetry/api";

/**
 * Manual span helpers.
 *
 * Next.js instruments its own request handling automatically, so every request
 * already produces a root span. What automatic instrumentation cannot know is
 * what this application is doing inside that request — which channel was
 * asked for, how many items came back, whether the database lookup or the XML
 * rendering was the slow part. Those are the spans added by hand below, and
 * they are the ones worth looking at in Jaeger when a feed is slow.
 */
const TRACER_NAME = "rss-server";

export function tracer() {
  return trace.getTracer(TRACER_NAME);
}

/**
 * Runs `fn` inside a named span, recording the exception and marking the span
 * as failed if it throws.
 *
 * The span is always ended in a finally block. A span that is started and
 * never ended is worse than no span: it never gets exported, so the trace
 * shows a gap exactly where the failure was.
 */
export async function withSpan<T>(
  name: string,
  attributes: Attributes,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer().startActiveSpan(name, { attributes }, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/** Adds attributes to whichever span is currently active, if there is one. */
export function annotateSpan(attributes: Attributes) {
  trace.getActiveSpan()?.setAttributes(attributes);
}
