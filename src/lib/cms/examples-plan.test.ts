import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { planExampleRemoval } from "./examples-plan";
import type { Entry } from "./types";
import { parsePostMarkdown } from "@/lib/agent/markdown";
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseExampleName } from "./examples";

type Category = { id: string; slug: string; parentId?: string | null; image?: string; metadata?: Record<string, unknown> };

const t0 = "2026-01-01T00:00:00.000Z";
const t1 = "2026-01-02T00:00:00.000Z";

function makeEntry(partial: Partial<Entry> & { collection: "posts" | "pages"; slug: string; data?: Record<string, unknown> }): Entry {
  const now = t0;
  return {
    id: partial.id ?? crypto.randomUUID(),
    collection: partial.collection,
    slug: partial.slug,
    status: partial.status ?? "published",
    visibility: partial.visibility ?? "public",
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
    publishedAt: partial.publishedAt ?? now,
    authorId: partial.authorId ?? null,
    data: (partial.data as Entry["data"]) ?? { title: partial.slug, content: [], categories: [] },
    ...(partial.pendingData ? { pendingData: partial.pendingData as Entry["pendingData"] } : {}),
    ...(partial.metadata ? { metadata: partial.metadata } : {}),
  };
}

describe("planExampleRemoval", () => {
  it("deletes everything on an all-examples site", () => {
    const categories: Category[] = [
      { id: "c1", slug: "alpha", metadata: { example: true } },
      { id: "c2", slug: "beta", parentId: "c1", metadata: { example: true } },
    ];
    const entries: Entry[] = [
      makeEntry({ collection: "posts", slug: "p1", metadata: { example: true } }),
      makeEntry({ collection: "pages", slug: "page-1", metadata: { example: true } }),
    ];
    const media = ["m1", "m2"];
    const plan = planExampleRemoval({ entries, categories, exampleMedia: media });
    assert.equal(plan.entries.length, entries.length);
    assert.equal(plan.categories.length, categories.length);
    assert.equal(plan.media.length, media.length);
    assert.equal(plan.keptEntries.length, 0);
    assert.equal(plan.keptCategories.length, 0);
    assert.equal(plan.keptMedia.length, 0);
  });

  it("never plans to remove the maker's own work", () => {
    const categories: Category[] = [{ id: "c1", slug: "alpha", metadata: { example: true } }];
    const entries: Entry[] = [makeEntry({ collection: "posts", slug: "mine", metadata: {} })];
    const plan = planExampleRemoval({ entries, categories, exampleMedia: [] });
    assert.equal(plan.entries.length, 0);
    assert.equal(plan.keptEntries.length, 0);
  });

  it("keeps an example category and its parent when a maker's post is in it", () => {
    const parent: Category = { id: "c1", slug: "alpha", metadata: { example: true } };
    const child: Category = { id: "c2", slug: "beta", parentId: "c1", metadata: { example: true } };
    const entries: Entry[] = [makeEntry({ collection: "posts", slug: "post", data: { title: "post", categories: [child.id] } })];
    const plan = planExampleRemoval({ entries, categories: [parent, child], exampleMedia: [] });
    assert(plan.keptCategories.some((c) => c.id === child.id));
    assert(plan.keptCategories.some((c) => c.id === parent.id));
    assert(!plan.categories.some((c) => c.id === child.id));
    assert(!plan.categories.some((c) => c.id === parent.id));
  });

  it("keeps an example parent when a maker's category sits inside it", () => {
    const parent: Category = { id: "c1", slug: "alpha", metadata: { example: true } };
    const mine: Category = { id: "c2", slug: "mine", parentId: "c1" };
    const plan = planExampleRemoval({ entries: [], categories: [parent, mine], exampleMedia: [] });
    assert(plan.keptCategories.some((c) => c.id === parent.id));
  });

  it("keeps an example category listed by the maker's Home page", () => {
    const cat: Category = { id: "c1", slug: "alpha", metadata: { example: true } };
    const home: Entry = makeEntry({ collection: "pages", slug: "home", data: { title: "Home", postsCategory: cat.slug, categories: [] } });
    const plan = planExampleRemoval({ entries: [home], categories: [cat], exampleMedia: [] });
    assert(plan.keptCategories.some((c) => c.id === cat.id));
  });

  it("keeps an example page a maker's page sits under", () => {
    const about: Entry = makeEntry({ collection: "pages", slug: "about", metadata: { example: true }, data: { title: "About", categories: [] } });
    const team: Entry = makeEntry({ collection: "pages", slug: "team", data: { title: "Team", parent: "about", categories: [] } });
    const plan = planExampleRemoval({ entries: [about, team], categories: [], exampleMedia: [] });
    assert(plan.keptEntries.some((e) => e.slug === "about"));
    assert(!plan.entries.some((e) => e.slug === "about"));
  });

  it("removes edited examples and the media only they use", () => {
    const edited: Entry = makeEntry({
      collection: "posts",
      slug: "p1",
      updatedAt: t1,
      metadata: { example: true },
      data: { title: "p1", content: [{ type: "image", id: "b1", mediaId: "m1" }], categories: [] },
    });
    const plan = planExampleRemoval({ entries: [edited], categories: [], exampleMedia: ["m1", "m2"] });
    assert(plan.entries.some((e) => e.slug === "p1"));
    assert.equal(plan.keptEntries.length, 0);
    assert.deepEqual(plan.media, ["m1", "m2"]);
  });

  it("keeps media used by maker entries, SEO image and category images", () => {
    const makerPost = makeEntry({
      collection: "posts",
      slug: "note",
      data: { title: "note", previewImage: "m1", content: [{ type: "gallery", id: "g1", mediaIds: ["m2", "m3"] }], categories: [] },
    });
    const makerPage = makeEntry({
      collection: "pages",
      slug: "home",
      data: { title: "Home", seo: { ogImage: "m4" }, categories: [] },
    });
    const cat: Category = { id: "c1", slug: "alpha", image: "m5", metadata: { example: true } };
    // A maker post in the example category keeps it, so its image should be kept too.
    const makerInCat = makeEntry({
      collection: "posts",
      slug: "in-alpha",
      data: { title: "in alpha", categories: [cat.id] },
    });
    const plan = planExampleRemoval({
      entries: [makerPost, makerPage, makerInCat],
      categories: [cat],
      exampleMedia: ["m1", "m2", "m3", "m4", "m5", "m6"],
    });
    for (const id of ["m1", "m2", "m3", "m4", "m5"]) {
      assert(plan.keptMedia.includes(id), `expected keptMedia to include ${id}`);
    }
  });

  it("lists categories to remove with inside ones first", () => {
    const parent: Category = { id: "c1", slug: "alpha", metadata: { example: true } };
    const child: Category = { id: "c2", slug: "beta", parentId: "c1", metadata: { example: true } };
    const plan = planExampleRemoval({ entries: [], categories: [parent, child], exampleMedia: [] });
    assert.equal(plan.categories.length, 2);
    assert.equal(plan.categories[0].id, "c2");
    assert.equal(plan.categories[1].id, "c1");
  });
});

describe("seed/ilo integrity", () => {
  const seedDir = path.join(process.cwd(), "seed", "ilo");
  const mediaDir = path.join(seedDir, "media");
  const postsDir = path.join(seedDir, "posts");
  const pagesDir = path.join(seedDir, "pages");

  it("every referenced file exists, every referenced category is listed, every parent page exists", async () => {
    const site = JSON.parse(await fs.readFile(path.join(seedDir, "site.json"), "utf8")) as {
      categories?: { slug: string }[];
    };
    const catSlugs = new Set((site.categories ?? []).map((c) => c.slug));

    const pageFiles = (await fs.readdir(pagesDir)).filter((f) => f.endsWith(".md"));
    const postFiles = (await fs.readdir(postsDir)).filter((f) => f.endsWith(".md"));
    const allPageSlugs = new Set(
      await Promise.all(
        pageFiles.map(async (f) => {
          const md = await fs.readFile(path.join(pagesDir, f), "utf8");
          const { meta } = parsePostMarkdown(md);
          const slug = meta.slug || f.replace(/^\d+-/, "").replace(/\.md$/, "");
          return slug;
        })
      )
    );

    async function checkMd(dir: string, file: string) {
      const md = await fs.readFile(path.join(dir, file), "utf8");
      // Every (file:NAME) exists in media/
      for (const m of md.matchAll(/\((?:file|media)=?file:([^\)\s]+)\)/g)) {
        const name = m[1];
        const exists = await fs
          .access(path.join(mediaDir, name))
          .then(() => true)
          .catch(() => false);
        assert(exists, `Missing media file: ${name}`);
      }
      const { meta } = parsePostMarkdown(md);
      // Every post category is listed in site.json
      if (dir.endsWith("posts") && Array.isArray(meta.categories)) {
        for (const slug of meta.categories) {
          assert(catSlugs.has(slug), `Unknown category in post: ${slug}`);
        }
      }
      // Every Home page postsCategory is listed
      if (dir.endsWith("pages") && meta.postsCategory) {
        assert(catSlugs.has(meta.postsCategory), `Unknown postsCategory on page: ${meta.postsCategory}`);
      }
      // Every parent page exists
      if (dir.endsWith("pages") && meta.parent) {
        assert(allPageSlugs.has(meta.parent), `Unknown parent page: ${meta.parent}`);
      }
    }

    for (const f of postFiles) await checkMd(postsDir, f);
    for (const f of pageFiles) await checkMd(pagesDir, f);
  });
});

describe("parseExampleName", () => {
  it("rejects invalid or unknown names", async () => {
    for (const bad of ["", "../seed", "ilo/../ilo", "unknown", 123 as unknown as string]) {
      await assert.rejects(() => parseExampleName(bad as string), /must be one of/);
    }
  });
});

