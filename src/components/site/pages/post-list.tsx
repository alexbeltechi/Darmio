import Link from "next/link";
import { MediaImage } from "@/components/shared/media-image";
import { entryDate } from "@/lib/cms/read-time";
import type { Entry, MediaItem } from "@/lib/cms/types";
import { getPostMediaItems, type Category } from "../post-grid-shared";
import type { ViewIntro } from "../site-views";
import { PageColumn } from "./page-layout";
import { PostListRow } from "./post-list-row";

const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
const MONTH = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" });

/**
 * A category's posts stacked like an archive, newest first, left-aligned in
 * the reading column (the `list` category layout): the title, its line and
 * how many posts, then the posts as rows, each with a rule under it: its
 * title and, under it in small capitals, the day and its own categories
 * (each a link to its page); its picture, when it has one, on the right, whole
 * and in its own shape, no frame (post-list-row.tsx; a video plays muted, on
 * a loop). No description. A month's posts sit under its name ("December
 * 2025"); the newest month, at the top, needs none.
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
  // Posts arrive newest first, so a month's posts are already together.
  const months: { label: string; posts: Entry[] }[] = [];
  for (const post of posts) {
    const label = MONTH.format(entryDate(post));
    const last = months[months.length - 1];
    if (last?.label === label) last.posts.push(post);
    else months.push({ label, posts: [post] });
  }

  return (
    <PageColumn>
      <header className="flex flex-col gap-ds-8">
        <h1 className="text-h2 text-ds-fg sm:text-h1">{intro.title}</h1>
        {intro.description && <p className="text-prose text-ds-fg-muted">{intro.description}</p>}
        <p className="text-p text-ds-fg-subtle">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </header>
      <div className="flex flex-col">
        {months.map((month, i) => (
          <section key={month.label} aria-label={month.label} className="flex flex-col">
            {i > 0 && (
              <h2 className="pt-ds-16 pb-ds-20 text-small tracking-wide text-ds-fg-subtle uppercase">{month.label}</h2>
            )}
            {month.posts.map((post) => (
              <PostListEntry
                key={post.id}
                post={post}
                media={getPostMediaItems(post, mediaMap)[0]}
                categories={((post.data.categories as string[]) || [])
                  .map((id) => categoryMap.get(id))
                  .filter((c): c is Category => Boolean(c))}
              />
            ))}
          </section>
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
          className="size-full object-contain"
        />
      ) : (
        <MediaImage item={media} alt={media.alt || title} fill sizes="240px" className="object-contain" />
      )}
    </Link>
  );

  return (
    <PostListRow picture={picture} aspect={media?.width && media.height ? media.width / media.height : 3 / 2}>
      <h3 className="text-h3 text-ds-fg">
        <Link href={href} className="underline-offset-4 hover:underline">
          {title}
        </Link>
      </h3>
      <p className="text-small tracking-wide text-ds-fg-subtle uppercase">
        <span className="tabular-nums">{DAY.format(entryDate(post))}</span>
        {categories.map((category) => (
          <span key={category.id}>
            {" · "}
            <Link href={`/${category.slug}`} className="hover:text-ds-fg">
              {category.label}
            </Link>
          </span>
        ))}
      </p>
    </PostListRow>
  );
}
