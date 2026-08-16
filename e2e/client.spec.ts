import { expect, test } from "@playwright/test";

/**
 * The client use case: retrieving and viewing an RSS feed.
 *
 * This is the subscriber's half of the system. The /client page is a real RSS
 * reader — it fetches the feed over HTTP and parses the XML in the browser —
 * so driving it exercises the same path any external reader would take.
 */

test.describe("Client use case — retrieving and viewing a feed", () => {
  test("retrieves the aggregate feed and renders its items", async ({ page }) => {
    await page.goto("/client");

    // Point the reader at the aggregate channel and fetch it, exactly as a
    // person would.
    await page.getByRole("button", { name: "/rss — everything" }).click();
    await page.getByRole("button", { name: "Fetch feed" }).click();

    // A retrieved feed must show its items, not merely report success.
    await expect(page.locator("article.feed-row").first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/\d+ items?/).first()).toBeVisible();

    // The raw XML is on screen too, which is what makes this demonstrably a
    // real RSS client rather than a second view of the same database.
    await expect(
      page.getByLabel("Raw XML received from the server"),
    ).toBeAttached();
  });

  test("switching channel changes only the endpoint", async ({ page }) => {
    await page.goto("/client");
    await page.getByRole("button", { name: "/rss/careers" }).click();
    await page.getByRole("button", { name: "Fetch feed" }).click();

    await expect(page.getByLabel("Feed endpoint URL")).toHaveValue("/rss/careers");
    await expect(page.locator("article.feed-row").first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("serves a valid RSS 2.0 channel over HTTP", async ({ request }) => {
    const response = await request.get("/rss");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/rss+xml");

    const xml = await response.text();
    // The elements a standards-compliant reader requires.
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<channel>");
    expect(xml).toContain("<title>");
    expect(xml).toContain("<pubDate>");
    expect(xml).toContain('<guid isPermaLink="false">');
    // RFC-822 dates, not ISO-8601 — the most common way to publish a feed
    // that validators reject.
    expect(xml).toMatch(/<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/);
  });

  test("serves each channel separately", async ({ request }) => {
    const careers = await request.get("/rss/careers");
    expect(careers.status()).toBe(200);
    expect(await careers.text()).toContain("Careers");
  });

  test("tells a client that a channel does not exist", async ({ request }) => {
    // A reader asking for a mistyped channel must be told, rather than handed
    // a valid but permanently empty feed it would poll forever.
    const response = await request.get("/rss/not-a-channel");
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("Unknown channel");
  });

  test("feed polls appear in the operational dashboard", async ({
    page,
    request,
  }) => {
    // The dashboard's central claim is that its figures are measured. This
    // checks that claim end to end: poll a feed, then confirm the count the
    // dashboard reports actually moved.
    const before = await request.get("/api/dashboard?since=1h");
    const beforePolls = (await before.json()).data.totals.feedPolls;

    for (let i = 0; i < 3; i++) {
      await request.get("/rss/careers");
    }

    const after = await request.get("/api/dashboard?since=1h");
    const afterData = (await after.json()).data;
    expect(afterData.totals.feedPolls).toBeGreaterThanOrEqual(beforePolls + 3);

    // And it must be visible to a person, not only in the JSON.
    await page.goto("/dashboard");
    await expect(page.getByText("Requests per feed")).toBeVisible();
    await expect(page.getByText("Unique clients")).toBeVisible();
  });
});
