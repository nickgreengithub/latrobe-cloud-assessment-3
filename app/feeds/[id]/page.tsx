import { FeedDetail } from "@/components/FeedDetail";

/**
 * Dynamic post page. Assessment 1 pre-rendered one page per seed post with
 * generateStaticParams and dynamicParams = false, because the site was a static
 * export. The posts now live in the database and can be created at runtime, so
 * the route is rendered on demand instead.
 */
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
