import Link from "next/link";
import { MediaImage } from "@/components/shared/media-image";
import { entryDate, readMinutes } from "@/lib/cms/read-time";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { getPostMediaItems, getPreviewText } from "../post-grid-shared";
import type { ViewIntro } from "../site-views";
import { PageColumn } from "./page-layout";

const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

/**
 * A category's posts stacked like a blog, newest first, left-aligned in the
 * reading column (the `list` category layout, decisions 2026-10-28): the
 * title, its line and how many posts, then each post as its picture (when it
 * has one; a video plays muted, on a loop), its title, the date and read
 * time, and its description or the start of its text. Posts with and
 * without pictures sit in the same stream.
 */
export function PostList({
  intro,
  posts,
  mediaMap,
}: {
  intro: ViewIntro;
  posts: Entry[];
  mediaMap: Map<string, MediaItem>;
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
      <div className="flex flex-col gap-ds-80 pt-ds-40">
        {posts.map((post) => (
          <PostListEntry key={post.id} post={post} media={getPostMediaItems(post, mediaMap)[0]} />
        ))}
      </div>
    </PageColumn>
  );
}

function PostListEntry({ post, media }: { post: Entry; media?: MediaItem }) {
  const href = `/post/${post.slug}`;
  const title = (post.data.title as string) || post.slug;
  const text = getPreviewText(post);
  const isVideo = media?.mime.startsWith("video/");

  return (
    <article className="flex flex-col gap-ds-16">
      {media && (
        <Link href={href} aria-label={title} className="block">
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
            <MediaImage item={media} alt={media.alt || title} sizes="(max-width: 700px) 100vw, 661px" className="h-auto w-full" />
          )}
        </Link>
      )}
      <div className="flex flex-col gap-ds-8">
        <h2 className="text-h2 text-ds-fg">
          <Link href={href} className="hover:underline hover:underline-offset-4">
            {title}
          </Link>
        </h2>
        <p className="text-p text-ds-fg-subtle">
          {DAY.format(entryDate(post))} · {readMinutes(post)} min
        </p>
        {text && <p className="text-prose text-ds-fg-muted">{text}</p>}
      </div>
    </article>
  );
}
