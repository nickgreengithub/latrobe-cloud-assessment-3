import { FeedDetail } from "@/components/FeedDetail";
import { SEED_FEEDS } from "@/lib/feeds";

// Pre-render a static detail page per seed post for the static export.
export function generateStaticParams() {
  return SEED_FEEDS.map((feed) => ({ id: feed.id }));
}

export const dynamicParams = false;

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="view">
      <div className="view-body scroll-area detail-scroll">
        <FeedDetail id={id} />
      </div>
    </div>
  );
}
