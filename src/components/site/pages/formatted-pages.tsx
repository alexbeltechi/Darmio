import Link from "next/link";
import { DsLinkList, type DsLinkListItem } from "@beltechi/parabola";
import { DsNewsletterBlock } from "@beltechi/parabola/blocks";
import { ArticleContent } from "@/components/site/article-content";
import { categoryGroups } from "@/lib/cms/category-groups";
import { getEntryMediaIds } from "@/lib/cms/entry-media";
import { getMediaByIds } from "@/lib/cms/media";
import { HOME_POSTS, homeMoreLabel, pageSettings } from "@/lib/cms/page-formats";
import { entryDate, readMinutes } from "@/lib/cms/read-time";
import type { Block, Entry } from "@/lib/cms/types";
import { listCategories } from "@/lib/db/categories";
import { getPublishedEntries } from "@/lib/db/entries";
import { childPages, listSitePages, type SitePage } from "@/lib/db/site-pages";
import { PageColumn, PageIntro, PageSection } from "./page-layout";

/**
 * The pages that have a format (lib/cms/page-formats.ts): Text, Links and
 * Home. Each is a fixed layout around the page's own blocks, in one reading
 * column, built from Parabola's tokens, type scale and link list.
 */

const pageItem = (page: SitePage): DsLinkListItem => ({ label: page.title, href: `/${page.slug}` });

/** A page's blocks, in the column, with the media they use. */
async function Blocks({ page, preview }: { page: Entry; preview: boolean }) {
  const blocks = (page.data.content as Block[]) || [];
  if (blocks.length === 0) return null;
  const mediaItems = await getMediaByIds(getEntryMediaIds(page));
  return <ArticleContent blocks={blocks} mediaItems={mediaItems} preview={preview} />;
}

/** The page's paragraph (PageIntro), with the page it sits under above it. */
function PageTitle({ page, parent }: { page: Entry; parent?: SitePage }) {
  const description = page.data.description as string | undefined;
  return (
    <header className="flex flex-col gap-ds-8">
      {parent && (
        <Link href={`/${parent.slug}`} className="text-p text-ds-fg-subtle hover:text-ds-fg">
          {parent.title}
        </Link>
      )}
      <PageIntro title={(page.data.title as string) || page.slug} text={description} />
    </header>
  );
}

/**
 * Text: the page's paragraph, the blocks, then "More": the pages under it, or, for a
 * page under another, that page and the others beside it.
 */
export async function TextPage({ page, preview = false }: { page: Entry; preview?: boolean }) {
  const pages = await listSitePages();
  const { parent: parentSlug } = pageSettings(page.data);
  const parent = parentSlug ? pages.find((p) => p.slug === parentSlug) : undefined;
  const more = parent
    ? [parent, ...childPages(pages, parent.slug).filter((p) => p.slug !== page.slug)]
    : childPages(pages, page.slug);

  return (
    <PageColumn>
      <PageTitle page={page} parent={parent} />
      <Blocks page={page} preview={preview} />
      {more.length > 0 && (
        <PageSection title="More">
          <DsLinkList items={more.map(pageItem)} />
        </PageSection>
      )}
    </PageColumn>
  );
}

/** Links: the page's paragraph, the links (each note on the right), then any blocks. */
export async function LinksPage({ page, preview = false }: { page: Entry; preview?: boolean }) {
  const { links } = pageSettings(page.data);
  return (
    <PageColumn>
      <PageTitle page={page} />
      {links.length > 0 && <DsLinkList divided items={links.map((l) => ({ label: l.label, href: l.url, meta: l.note }))} />}
      <Blocks page={page} preview={preview} />
    </PageColumn>
  );
}

/**
 * Home: the page's own blocks (a portrait, a few lines), then sections made
 * from the rest of the site, in this order: the latest posts of one category
 * (ending in a link to all of them), each top-level page that has pages
 * under it (ending in a link to that page), each links page, and the
 * newsletter. Nothing here is typed twice: a page added under About shows up
 * under About.
 */
export async function HomePage({ page, preview = false }: { page: Entry; preview?: boolean }) {
  const settings = pageSettings(page.data);
  const [pages, categories, posts] = await Promise.all([listSitePages(), listCategories(), getPublishedEntries("posts")]);

  // The category it lists: the one chosen, else the first in the nav.
  const groups = categoryGroups(categories);
  const group = groups.find((g) => g.slug === settings.postsCategory) ?? groups.find((g) => g.nav);
  const slugById = new Map(categories.map((c) => [c.id, c.slug]));
  const listed = group
    ? posts
        .filter((post) => ((post.data.categories as string[]) || []).some((id) => group.members.includes(slugById.get(id) ?? "")))
        .sort((a, b) => entryDate(b).getTime() - entryDate(a).getTime())
    : [];

  const parents = pages.filter((p) => !p.settings.parent && childPages(pages, p.slug).length > 0);
  const linkPages = pages.filter((p) => p.settings.format === "links" && p.settings.links.length > 0);

  return (
    <PageColumn>
      <Blocks page={page} preview={preview} />

      {group && listed.length > 0 && (
        <PageSection title={group.label} href={`/${group.slug}`}>
          <DsLinkList
            items={listed.slice(0, HOME_POSTS).map((post) => ({
              label: (post.data.title as string) || post.slug,
              href: `/post/${post.slug}`,
              meta: `${entryDate(post).getFullYear()} · ${readMinutes(post)} min`,
            }))}
            more={{ label: `All ${listed.length} ${listed.length === 1 ? "post" : "posts"}`, href: `/${group.slug}` }}
          />
        </PageSection>
      )}

      {parents.map((parent) => (
        <PageSection key={parent.slug} title={parent.title} href={`/${parent.slug}`}>
          <DsLinkList
            items={childPages(pages, parent.slug).map(pageItem)}
            more={{ label: homeMoreLabel(parent.slug, parent.title), href: `/${parent.slug}` }}
          />
        </PageSection>
      ))}

      {linkPages.map((links) => (
        <PageSection key={links.slug} title={links.title} href={`/${links.slug}`}>
          <DsLinkList items={links.settings.links.map((l) => ({ label: l.label, href: l.url, meta: l.note }))} />
        </PageSection>
      ))}

      {settings.newsletter && (
        <div id="newsletter" className="scroll-mt-24 border-t border-ds-border pt-ds-40">
          <DsNewsletterBlock heading={settings.newsletter.heading} text={settings.newsletter.text} source="/" />
        </div>
      )}
    </PageColumn>
  );
}
