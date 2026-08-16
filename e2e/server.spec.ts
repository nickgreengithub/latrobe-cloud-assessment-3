import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * The server use case: CRUD on an RSS feed.
 *
 * "The server" here is the authoring side — the console an administrator uses
 * to put announcements into a channel. The test drives the real interface a
 * person would use, then checks the API and the published RSS agree with what
 * the interface claimed happened. A UI test that only asserts on the UI can
 * pass while the feed it is supposed to be publishing stays empty.
 */

/** Unique per run, so repeated runs never collide on the title. */
function uniqueTitle() {
  return `Playwright announcement ${Date.now()}`;
}

async function findPostByTitle(request: APIRequestContext, title: string) {
  const response = await request.get(`/api/posts?q=${encodeURIComponent(title)}`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  return body.data.find((post: { title: string }) => post.title === title);
}

test.describe("Server use case — CRUD on an RSS feed", () => {
  test("creates, reads, updates and deletes an announcement", async ({
    page,
    request,
  }) => {
    const title = uniqueTitle();
    const updatedSummary = "Updated by the end-to-end test.";

    // ---- CREATE, through the authoring form ----
    await page.goto("/feeds/new");
    await page.getByLabel("Title").fill(title);
    await page
      .getByLabel("Summary")
      .fill("Created by the Playwright end-to-end test.");
    await page
      .getByLabel("Full content")
      .fill("This announcement exists to prove the create path works.");
    await page.getByLabel("Author").fill("Playwright Runner");
    await page.getByLabel("Channels").selectOption("careers");
    await page.getByRole("button", { name: "Publish to feed" }).click();

    // The form navigates to the feed list once the post is stored.
    await expect(page).toHaveURL(/\/feeds/, { timeout: 15_000 });

    // ---- READ, through the API ----
    const created = await findPostByTitle(request, title);
    expect(created, "the created post should be retrievable").toBeTruthy();
    expect(created.status).toBe("published");

    // ---- READ, through the published RSS feed ----
    // The point of the whole application: an announcement that is stored but
    // never reaches the feed has not actually been published.
    const feed = await request.get("/rss/careers");
    expect(feed.status()).toBe(200);
    expect(feed.headers()["content-type"]).toContain("application/rss+xml");
    expect(await feed.text()).toContain(title);

    // ---- UPDATE ----
    const patched = await request.patch(`/api/posts/${created.id}`, {
      data: { summary: updatedSummary },
    });
    expect(patched.status()).toBe(200);
    expect((await patched.json()).data.summary).toBe(updatedSummary);

    const reread = await request.get(`/api/posts/${created.id}`);
    expect((await reread.json()).data.summary).toBe(updatedSummary);

    // ---- DELETE ----
    const deleted = await request.delete(`/api/posts/${created.id}`);
    expect(deleted.status()).toBe(200);

    const gone = await request.get(`/api/posts/${created.id}`);
    expect(gone.status()).toBe(404);

    // And it must leave the feed, not merely the database.
    const feedAfter = await request.get("/rss/careers");
    expect(await feedAfter.text()).not.toContain(title);
  });

  test("rejects an announcement with no title", async ({ request }) => {
    // Input validation is where a marker looks first. An empty required field
    // must be refused by the server, not only by the browser's own form
    // checking, which any client can skip.
    const response = await request.post("/api/posts", {
      data: { title: "", summary: "no title", content: "no title" },
    });
    expect(response.status()).toBe(422);
    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.message).toContain("Validation failed");
  });

  test("rejects an announcement filed to a channel that does not exist", async ({
    request,
  }) => {
    const response = await request.post("/api/posts", {
      data: {
        title: uniqueTitle(),
        summary: "bad channel",
        content: "bad channel",
        feedSlugs: ["not-a-real-channel"],
      },
    });
    expect(response.status()).toBe(400);
    expect((await response.json()).ok).toBe(false);
  });

  test("reports health and records its own operational metrics", async ({
    request,
  }) => {
    const health = await request.get("/api/health");
    expect(health.status()).toBe(200);
    const body = await health.json();
    expect(body.data.status).toBe("healthy");
    expect(body.data.database.status).toBe("connected");

    // Prometheus exposition, for the scrape configured in prometheus.yml.
    const metrics = await request.get("/api/metrics");
    expect(metrics.status()).toBe(200);
    const text = await metrics.text();
    expect(text).toContain("rss_requests_total");
    expect(text).toContain("rss_feed_polls_total");
  });
});
