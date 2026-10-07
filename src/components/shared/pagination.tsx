import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  basePath: string;
  /** Query params to preserve on every page link (excluding `page`). */
  search?: Record<string, string | undefined>;
  className?: string;
};

function hrefFor(basePath: string, search: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value && key !== "page") params.set(key, value);
  }
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Compact window: first, last, ±1 around current, with ellipses. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  let prev = 0;
  for (const p of sorted) {
    if (prev && p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

export function Pagination({ page, totalPages, basePath, search = {}, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  const window = pageWindow(page, totalPages);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      <PageLink
        href={hrefFor(basePath, search, page - 1)}
        disabled={page <= 1}
        label="Previous page"
      >
        <ChevronLeft size={16} />
      </PageLink>
      {window.map((entry, i) =>
        entry === "…" ? (
          <span key={`gap-${i}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(basePath, search, entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg text-sm font-medium transition",
              entry === page
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {entry}
          </Link>
        ),
      )}
      <PageLink href={hrefFor(basePath, search, page + 1)} disabled={page >= totalPages} label="Next page">
        <ChevronRight size={16} />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        aria-disabled
        className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground/40"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}
