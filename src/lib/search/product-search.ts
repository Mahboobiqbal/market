import "server-only";
import { prisma } from "@/lib/db/prisma";

/**
 * Product search abstraction.
 *
 * Today: MongoDB `$regex` (case-insensitive) via a raw find command —
 * Prisma's `contains` is case-sensitive on MongoDB, so raw is required.
 *
 * Later: swap `findProductIds` for an Algolia / Meilisearch client without
 * touching any caller — the rest of the app only consumes product IDs.
 */

const MAX_CANDIDATES = 500;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function idOf(doc: unknown): string | null {
  if (typeof doc === "string") return doc;
  if (doc && typeof doc === "object" && "$oid" in doc) {
    const oid = (doc as { $oid?: unknown }).$oid;
    return typeof oid === "string" ? oid : null;
  }
  return null;
}

/** Returns candidate product IDs matching free text, in rank order (0 = best). */
export async function findProductIds(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = escapeRegex(q);
  const or = [
    { name: { $regex: pattern, $options: "i" } },
    { shortDescription: { $regex: pattern, $options: "i" } },
    { sku: { $regex: pattern, $options: "i" } },
  ];

  try {
    const res = (await prisma.$runCommandRaw({
      find: "Product",
      filter: { $or: or },
      projection: { _id: 1 },
      limit: MAX_CANDIDATES,
    })) as { cursor?: { firstBatch?: unknown[] } };

    const ids: string[] = [];
    for (const doc of res.cursor?.firstBatch ?? []) {
      const id = idOf((doc as Record<string, unknown>)._id);
      if (id) ids.push(id);
    }
    return ids;
  } catch {
    // Fallback: case-sensitive contains (still correct, just stricter).
    const rows = await prisma.product.findMany({
      where: { name: { contains: q } },
      select: { id: true },
      take: MAX_CANDIDATES,
    });
    return rows.map((r) => r.id);
  }
}

/** Simple keyword suggestions from active product names (top 6). */
export async function suggestSearchKeywords(query: string): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const ids = await findProductIds(q);
  if (ids.length === 0) return [];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: { name: true },
    take: 6,
  });
  return products.map((p) => p.name);
}
