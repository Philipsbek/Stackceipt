// Deterministic color assignment for spend categories.
// Categories are free-form strings, so colors are assigned by a stable order
// (largest spend first) and shared between the category and department charts
// so a color means the same category in both places.

// A categorical palette chosen for distinctness and legibility on a light card.
const PALETTE = [
  "#2563eb", // blue
  "#16a34a", // green
  "#d97706", // amber
  "#7c3aed", // violet
  "#dc2626", // red
  "#0891b2", // cyan
  "#db2777", // pink
  "#4f46e5", // indigo
  "#059669", // emerald
  "#ca8a04", // yellow
  "#e11d48", // rose
  "#0d9488", // teal
];

// Fallback for the catch-all buckets so they read as "neutral / unknown".
const NEUTRAL = "#94a3b8"; // slate
const NEUTRAL_NAMES = new Set(["uncategorized", "unassigned", "other"]);

/**
 * Build a category -> hex color map. Pass categories in the order you want
 * colors assigned (e.g. sorted by spend, largest first) for stable results.
 */
export function buildCategoryColorMap(categories: string[]): Map<string, string> {
  const map = new Map<string, string>();
  let i = 0;
  for (const raw of categories) {
    if (map.has(raw)) continue;
    if (NEUTRAL_NAMES.has(raw.toLowerCase())) {
      map.set(raw, NEUTRAL);
      continue;
    }
    map.set(raw, PALETTE[i % PALETTE.length]!);
    i++;
  }
  return map;
}

export function categoryColor(map: Map<string, string>, name: string): string {
  return map.get(name) ?? NEUTRAL;
}
