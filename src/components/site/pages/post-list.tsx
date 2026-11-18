import Link from "next/link";
import { MediaImage } from "@/components/shared/media-image";
import { entryDate } from "@/lib/cms/read-time";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { getPostMediaItems, type Category } from "../post-grid-shared";
import type { ViewIntro } from "../site-views";
import { PageColumn } from "./page-layout";
import { PostListRow } from "./post-list-row";

const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

/**
 * A category's posts stacked like a blog, newest first, left-aligned in the
 * reading column (the `list` category layout): the
 * title, its line and how many posts, then the posts as rows, each with a
 * rule under it: each its title in the size of a home page's lists and, under
 * it in small text, its own categories (each a link to its page) and the
 * date; its picture, when it has one, is a small one on the right in its own
 * shape (post-list-row.tsx; a video plays muted, on a loop). No description:
 * rows with and without pictures stay the same height in one stream.
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
      <div className="flex flex-col divide-y divide-ds-border border-b border-ds-border">
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
  const isVideo = media?.mime.startsWith("video/");

  const picture = media && (
    <Link href={href} aria-label={title} tabIndex={-1} className="absolute inset-0 block">
      {isVideo ? (
        <video
          src={media.url}
          poster={media.poster?.url}
          autoPlay
          muted
          loop
          playsInline
          className="size-full object-cover"
        />
      ) : (
        <MediaImage item={media} alt={media.alt || title} fill sizes="160px" className="object-cover" />
      )}
    </Link>
  );

  return (
    <PostListRow picture={picture} aspect={media?.width && media.height ? media.width / media.height : 3 / 2}>
      <h2 className="text-prose text-ds-fg">
        <Link
          href={href}
          className="underline decoration-ds-border underline-offset-4 transition-colors hover:decoration-ds-fg"
        >
          {title}
        </Link>
      </h2>
      <div className="flex items-baseline gap-ds-16 text-small text-ds-fg-subtle">
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
    </PostListRow>
  );
}
