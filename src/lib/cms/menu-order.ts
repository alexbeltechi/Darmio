/**
 * The site menu's order: the items a saved order names come first, in that
 * order; the rest follow in their own (categories, then pages, as the menu
 * is built). Pure, so the site and admin › Pages share it.
 */
export function orderMenu<T extends { slug: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((slug, i) => [slug, i]));
  const at = (item: T) => rank.get(item.slug) ?? Infinity;
  // Array.prototype.sort is stable, so unnamed items keep their own order.
  return [...items].sort((a, b) => at(a) - at(b));
}

/** The list with the item at `from` moved to `to`. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
