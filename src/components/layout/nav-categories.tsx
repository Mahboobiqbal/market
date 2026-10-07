"use client";

import Link from "next/link";
import { ChevronDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CategoryNode } from "@/services/category.service";

type NavCategoriesProps = {
  categories: CategoryNode[];
  className?: string;
};

export function NavCategories({ categories, className }: NavCategoriesProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 text-xs font-medium transition hover:bg-muted data-open:bg-muted">
          <LayoutGrid size={14} aria-hidden />
          All categories
          <ChevronDown size={12} aria-hidden className="opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[70vh] w-72 overflow-y-auto p-1.5">
          {categories.map((root) => (
            <div key={root.id} className="py-0.5">
              <DropdownMenuItem
                render={<Link href={`/categories/${root.slug}`} />}
                className="font-medium"
              >
                {root.name}
              </DropdownMenuItem>
              {root.children.slice(0, 6).map((child) => (
                <DropdownMenuItem
                  key={child.id}
                  render={<Link href={`/categories/${child.slug}`} />}
                  className="pl-7 text-muted-foreground"
                >
                  {child.name}
                </DropdownMenuItem>
              ))}
              {root.children.length > 6 ? (
                <DropdownMenuItem
                  render={<Link href={`/categories/${root.slug}`} />}
                  className="pl-7 text-xs text-primary"
                >
                  View all {root.children.length} subcategories
                </DropdownMenuItem>
              ) : null}
            </div>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <nav
        aria-label="Categories"
        className="hidden min-w-0 items-center gap-0.5 overflow-x-auto lg:flex"
      >
        {categories.slice(0, 6).map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="h-8 rounded-lg px-2.5 text-xs font-medium whitespace-nowrap text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {category.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
