import { ArticleContent } from "@/components/site/article-content";
import { getMediaByIds } from "@/lib/cms/media";
import type { Block, Entry } from "@/lib/cms/types";

/** Every media id the page's blocks reference. */
function blockMediaIds(blocks: Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.type === "gallery") return block.mediaIds;
    if (block.type === "image" || block.type === "video") return block.mediaId ? [block.mediaId] : [];
    return [];
  });
}

/**
 * A page from the page builder: its content blocks, stacked as in a post but
 * with no post header (the content opens the page). Shared by the public page
 * and the admin preview, which passes the page with its unpublished changes.
 */
export async function PageView({ page, preview = false }: { page: Entry; preview?: boolean }) {
  const blocks = (page.data.content as Block[]) || [];
  const mediaItems = await getMediaByIds(blockMediaIds(blocks));

  return (
    <main className="min-h-screen bg-ds-bg">
      <article className="px-5 pt-16 pb-16 lg:pt-24">
        <ArticleContent blocks={blocks} mediaItems={mediaItems} preview={preview} />
      </article>
    </main>
  );
}
