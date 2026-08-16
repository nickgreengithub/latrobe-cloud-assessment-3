-- AlterTable
ALTER TABLE "RequestLog" ADD COLUMN "clientKey" TEXT;
ALTER TABLE "RequestLog" ADD COLUMN "feedSlug" TEXT;

-- CreateTable
CREATE TABLE "FeedFetch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "feedSlug" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "clientKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "FeedFetch_createdAt_idx" ON "FeedFetch"("createdAt");

-- CreateIndex
CREATE INDEX "FeedFetch_feedSlug_idx" ON "FeedFetch"("feedSlug");

-- CreateIndex
CREATE INDEX "RequestLog_feedSlug_idx" ON "RequestLog"("feedSlug");

-- CreateIndex
CREATE INDEX "RequestLog_clientKey_idx" ON "RequestLog"("clientKey");
