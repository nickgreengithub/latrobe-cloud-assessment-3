import { FeedDetail } from "@/components/FeedDetail";

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
