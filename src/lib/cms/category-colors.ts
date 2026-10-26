import { DS_ACCENTS } from "@beltechi/parabola";

/**
 * Category swatches: the Parabola accents (see packages/parabola/accents.ts), the
 * ones the picker offers. A category stored with any other colour keeps it;
 * the picker lists it as its current colour.
 */
export const CATEGORY_COLOR_PRESETS = DS_ACCENTS;

export const CATEGORY_COLOR_VALUES: string[] = CATEGORY_COLOR_PRESETS.map((c) => c.value);

/** Stone: the neutral swatch, for a category with no colour. */
export const DEFAULT_CATEGORY_COLOR = "#78716C";

const ACCENT_BY_NAME = new Map<string, string>(DS_ACCENTS.map((c) => [c.name.toLowerCase(), c.value]));
const ACCENT_BY_VALUE = new Map<string, string>(DS_ACCENTS.map((c) => [c.value, c.name.toLowerCase()]));

/**
 * A stored colour as it should be drawn. Categories store an accent by name
 * ("red"), so changing what red is in Parabola reaches every category; older
 * records, and colours outside the accents, are a hex value and pass through
 * (upper-cased). No colour is the default.
 */
export function normalizeCategoryColor(color: string | undefined): string {
  if (!color) return DEFAULT_CATEGORY_COLOR;
  return ACCENT_BY_NAME.get(color.toLowerCase()) ?? color.toUpperCase();
}

/**
 * A colour as it should be stored: an accent's hex becomes its name, anything
 * else is kept as given. Pairs with normalizeCategoryColor.
 */
export function toStoredCategoryColor(color: string | undefined): string | undefined {
  if (!color) return color;
  return ACCENT_BY_VALUE.get(color.toUpperCase()) ?? color;
}
