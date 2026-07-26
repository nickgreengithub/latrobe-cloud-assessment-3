import { Breadcrumbs } from "@/components/Breadcrumbs";
import { FeedDetail } from "@/components/FeedDetail";

export default async function FeedDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="stack">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Feeds", href: "/feeds" },
          { label: "Item" },
        ]}
      />
      <FeedDetail id={id} />
    </div>
  );
}
