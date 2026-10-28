import { entryDate } from "@/lib/cms/read-time";
import type { Entry } from "@/lib/cms/types";
import type { ViewIntro } from "../site-views";
import { LinkRows, PageColumn } from "./link-rows";

const DAY = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });

/**
 * A category's posts as lines of text, by year, newest first: the title and
 * how many posts, then each year with its posts (title left, day and month
 * right). The `list` category layout, for writing (nicksaraev.com/archive).
 */
export function PostList({ intro, posts }: { intro: ViewIntro; posts: Entry[] }) {
  const years = new Map<number, Entry[]>();
  for (const post of posts) {
    const year = entryDate(post).getFullYear();
    years.set(year, [...(years.get(year) ?? []), post]);
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
      {[...years].map(([year, yearPosts]) => (
        <section key={year} className="flex flex-col gap-ds-8">
          <h2 className="text-h3 text-ds-fg">
            {year} <span className="text-small text-ds-fg-subtle">{yearPosts.length}</span>
          </h2>
          <LinkRows
            divided
            rows={yearPosts.map((post) => ({
              label: (post.data.title as string) || post.slug,
              href: `/post/${post.slug}`,
              meta: DAY.format(entryDate(post)),
            }))}
          />
        </section>
      ))}
    </PageColumn>
  );
}
