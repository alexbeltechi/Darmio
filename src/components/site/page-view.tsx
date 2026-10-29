import { ArticleContent } from "@/components/site/article-content";
import { HomePage, LinksPage, TextPage } from "@/components/site/pages/formatted-pages";
import { getEntryMediaIds } from "@/lib/cms/entry-media";
import { getMediaByIds } from "@/lib/cms/media";
import { pageSettings } from "@/lib/cms/page-formats";
import type { Block, Entry } from "@/lib/cms/types";

/**
 * A page from the page builder, in its format (lib/cms/page-formats.ts).
 * Blocks, the default: its content blocks, stacked as in a post but with no
 * post header (the content opens the page). Shared by the public page and
 * the admin preview, which passes the page with its unpublished changes.
 */
export async function PageView({ page, preview = false }: { page: Entry; preview?: boolean }) {
  const { format } = pageSettings(page.data);
  if (format === "text") return <TextPage page={page} preview={preview} />;
  if (format === "links") return <LinksPage page={page} preview={preview} />;
  if (format === "home") return <HomePage page={page} preview={preview} />;

  const blocks = (page.data.content as Block[]) || [];
  const mediaItems = await getMediaByIds(getEntryMediaIds(page));

  return (
    <main className="min-h-screen bg-ds-bg">
      <article className="px-5 pt-16 pb-16 lg:pt-24">
        <ArticleContent blocks={blocks} mediaItems={mediaItems} preview={preview} />
      </article>
    </main>
  );
}
