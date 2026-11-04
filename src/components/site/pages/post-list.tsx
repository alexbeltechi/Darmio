import Link from "next/link";
import { MediaImage } from "@/components/shared/media-image";
import { entryDate } from "@/lib/cms/read-time";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { getPostMediaItems, getPreviewText, type Category } from "../post-grid-shared";
import type { ViewIntro } from "../site-views";
import { PageColumn } from "./page-layout";

const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

/**
 * A category's posts stacked like a blog, newest first, left-aligned in the
 * reading column (the `list` category layout): the
 * title, its line and how many posts, then each post as its title in the
 * size of a home page's lists, the start of its text, and a row with its own
 * categories (each a link to its page) on the left and the date on the
 * right; its picture, when it has one, sits small to the right of the text
 * in its own shape (a video plays muted, on a loop). Posts with and without
 * pictures sit in the same stream, the text in line either way.
 */
export function PostList({
  intro,
  posts,
  mediaMap,
  categoryMap,
}: {
  intro: ViewIntro;
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
  categoryMap: Map<string, Category>;
}) {
  return (
    <PageColumn>
      <header className="flex flex-col gap-ds-8">
        <h1 className="text-h2 text-ds-fg sm:text-h1">{intro.title}</h1>
        {intro.description && <p className="text-prose text-ds-fg-muted">{intro.description}</p>}
        <p className="text-p text-ds-fg-subtle">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </header>
      <div className="flex flex-col gap-ds-40 pt-ds-16">
        {posts.map((post) => (
          <PostListEntry
            key={post.id}
            post={post}
            media={getPostMediaItems(post, mediaMap)[0]}
            categories={((post.data.categories as string[]) || [])
              .map((id) => categoryMap.get(id))
              .filter((c): c is Category => Boolean(c))}
          />
        ))}
      </div>
    </PageColumn>
  );
}

function PostListEntry({ post, media, categories }: { post: Entry; media?: MediaItem; categories: Category[] }) {
  const href = `/post/${post.slug}`;
  const title = (post.data.title as string) || post.slug;
  const text = getPreviewText(post);
  const isVideo = media?.mime.startsWith("video/");

  return (
    <article className="flex items-start gap-ds-20">
      <div className="flex min-w-0 flex-1 flex-col gap-ds-4">
        <h2 className="text-prose text-ds-fg">
          <Link
            href={href}
            className="underline decoration-ds-border underline-offset-4 transition-colors hover:decoration-ds-fg"
          >
            {title}
          </Link>
        </h2>
        {text && <p className="text-p text-ds-fg-muted">{text}</p>}
        <div className="flex items-baseline justify-between gap-4 pt-ds-4 text-p text-ds-fg-subtle">
          <span className="min-w-0 truncate">
            {categories.map((category, i) => (
              <span key={category.id}>
                {i > 0 && ", "}
                <Link href={`/${category.slug}`} className="hover:text-ds-fg">
                  {category.label}
                </Link>
              </span>
            ))}
          </span>
          <span className="shrink-0 tabular-nums">{DAY.format(entryDate(post))}</span>
        </div>
      </div>
      {media && (
        <Link href={href} aria-label={title} tabIndex={-1} className="block w-24 shrink-0 sm:w-36">
          {isVideo ? (
            <video
              src={media.url}
              poster={media.poster?.url}
              autoPlay
              muted
              loop
              playsInline
              className="h-auto w-full"
            />
          ) : (
            <MediaImage item={media} alt={media.alt || title} sizes="(max-width: 640px) 96px, 144px" className="h-auto w-full" />
          )}
        </Link>
      )}
    </article>
  );
}
