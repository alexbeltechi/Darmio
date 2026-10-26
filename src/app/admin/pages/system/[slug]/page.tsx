import { notFound } from "next/navigation";
import { ExternalLink, X } from "lucide-react";
import { DsButton } from "@beltechi/parabola";
import { listCategories } from "@/lib/db/categories";
import { buildSystemPages } from "@/lib/cms/system-pages";

/**
 * A system page in the page pane: one of the site's coded pages (home, a
 * category). Editing them in the admin comes later; for now the pane names
 * the page and links to it.
 */
export default async function SystemPagePane({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = buildSystemPages(await listCategories()).find((p) => p.slug === slug);
  if (!page) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center p-5">
        <DsButton href="/admin/pages" iconLeft={X} aria-label="Close" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-5 pb-[76px] text-center">
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-h3 text-ds-fg">{page.title}</h2>
          <p className="text-p text-ds-fg-subtle">{page.path}</p>
        </div>
        <p className="max-w-sm text-p text-ds-fg-muted">
          Editing this page here is coming soon. For now it&apos;s hardcoded.
        </p>
        <DsButton href={page.path} target="_blank" rel="noopener noreferrer" iconLeft={ExternalLink}>
          View on site
        </DsButton>
      </div>
    </div>
  );
}
