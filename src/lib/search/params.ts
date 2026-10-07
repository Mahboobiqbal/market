import { PRODUCT_SORT_VALUES, type ProductSort } from "@/constants";

/** URL parameter set for public catalog pages (prices in RUPEES in the URL). */
export type CatalogQuery = {
  q: string;
  category: string;
  brand: string;
  min: number | null; // rupees
  max: number | null; // rupees
  rating: number | null;
  stock: boolean;
  sort: ProductSort;
  page: number;
};

export type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function toInt(value: string, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function parseCatalogQuery(sp: SearchParams): CatalogQuery {
  const sortRaw = first(sp.sort);
  const ratingRaw = Number.parseFloat(first(sp.rating));
  return {
    q: first(sp.q).trim().slice(0, 120),
    category: first(sp.category).trim(),
    brand: first(sp.brand).trim(),
    min: first(sp.min) ? Math.max(0, Number.parseFloat(first(sp.min)) || 0) : null,
    max: first(sp.max) ? Math.max(0, Number.parseFloat(first(sp.max)) || 0) : null,
    rating: Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null,
    stock: first(sp.stock) === "1",
    sort: (PRODUCT_SORT_VALUES as readonly string[]).includes(sortRaw)
      ? (sortRaw as ProductSort)
      : "relevance",
    page: toInt(first(sp.page), 1, 1, 500),
  };
}

/** Convert a catalog query into URL search params (skipping empties). */
export function catalogQueryToParams(query: Partial<CatalogQuery>): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.brand) params.set("brand", query.brand);
  if (query.min != null) params.set("min", String(query.min));
  if (query.max != null) params.set("max", String(query.max));
  if (query.rating != null) params.set("rating", String(query.rating));
  if (query.stock) params.set("stock", "1");
  if (query.sort && query.sort !== "relevance") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params;
}
