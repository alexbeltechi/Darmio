"use client";

import * as React from "react";

/**
 * Two signals between the posts list and the post editor, which live side by
 * side and don't share state: a post was saved (the list refreshes its titles
 * and "Changes" pills), and posts were published (the list refreshes, and an
 * open post reloads, under its new slug if publishing gave it one).
 */
const SAVED_EVENT = "admin:post-saved";
const PUBLISHED_EVENT = "admin:published";

/** What a publish did. A draft's first publish can change its slug. */
export type PublishedDetail = { published: { slug: string; previousSlug: string }[] };

export function announceSaved() {
  window.dispatchEvent(new Event(SAVED_EVENT));
}

export function announcePublished(detail: PublishedDetail) {
  window.dispatchEvent(new CustomEvent<PublishedDetail>(PUBLISHED_EVENT, { detail }));
}

function useWindowEvent<T>(name: string, handler: (detail: T) => void) {
  const ref = React.useRef(handler);
  React.useEffect(() => {
    ref.current = handler;
  });
  React.useEffect(() => {
    const listener = (e: Event) => ref.current((e as CustomEvent<T>).detail);
    window.addEventListener(name, listener);
    return () => window.removeEventListener(name, listener);
  }, [name]);
}

export function useOnSaved(handler: () => void) {
  useWindowEvent(SAVED_EVENT, handler);
}

export function useOnPublished(handler: (detail: PublishedDetail) => void) {
  useWindowEvent(PUBLISHED_EVENT, handler);
}

/**
 * Publish posts: drafts go live, published posts' unpublished changes go live.
 * Returns what published and what didn't (e.g. a draft with no category).
 */
export async function publishPosts(slugs: string[], collection: "posts" | "pages" = "posts"): Promise<{
  published: { slug: string; previousSlug: string; title: string }[];
  failed: { slug: string; error: string }[];
}> {
  const res = await fetch("/api/admin/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slugs, collection }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Publish failed");
  if (json.published.length > 0) announcePublished({ published: json.published });
  return json;
}
