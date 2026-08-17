import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * The tests cover the two use cases the assessment asks for:
 *   e2e/server.spec.ts — the server use case: CRUD on an RSS feed
 *   e2e/client.spec.ts — the client use case: retrieving and reading a feed
 *
 * Playwright starts the application itself rather than assuming one is
 * already running, so `npx playwright test` works from a clean checkout and
 * in CI without a separate step to remember.
 */

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // The tests write to a shared database, so they run in sequence. Parallel
  // workers here would produce failures that depend on scheduling rather than
  // on the code, which is the least useful kind of test failure.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    // Deliberately not the machine's zone. The server below runs in UTC, so
    // every run reproduces the server/browser split that a real deployment
    // has and a laptop does not — which is how the hydration bug in
    // lib/format.ts reached production in the first place.
    timezoneId: "Asia/Bangkok",
    locale: "en-AU",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    // A production build, not `next dev`: dev-mode compilation happens on
    // first request, which makes the first assertion in every file wait on a
    // compiler rather than on the application.
    command: `npm run build && npx next start --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
      SITE_URL: BASE_URL,
      // Containers run UTC. Pinning it here means the tests see what the
      // deployment sees rather than whatever the developer's clock says.
      TZ: "UTC",
    },
  },
});
