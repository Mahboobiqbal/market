"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Heart,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  Package,
  ShoppingCart,
  Store,
  Tag,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { CategoryNode } from "@/services/category.service";

type MobileNavProps = {
  user: { name?: string | null; role: string } | null;
  categories: CategoryNode[];
};

export function MobileNav({ user, categories }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: "Home", icon: Store },
    { href: "/products", label: "All products", icon: Package },
    { href: "/wishlist", label: "Wishlist", icon: Heart },
    { href: "/cart", label: "Cart", icon: ShoppingCart },
    { href: "/account", label: "My account", icon: User },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu">
            <Menu size={18} />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-80 flex-col gap-0 p-0">
        <SheetHeader className="border-b px-4 py-4 text-left">
          <SheetTitle>Navigate</SheetTitle>
          <SheetDescription className="sr-only">Site navigation menu</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <SheetClose
                  render={
                    <Link
                      href={link.href}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
                    />
                  }
                >
                  <link.icon size={16} className="text-muted-foreground" aria-hidden />
                  {link.label}
                </SheetClose>
              </li>
            ))}
            {user && user.role !== "CUSTOMER" ? (
              <li>
                <SheetClose
                  render={
                    <Link
                      href={user.role === "SELLER" ? "/seller" : "/admin"}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-muted"
                    />
                  }
                  >
                  <LayoutDashboard size={16} className="text-muted-foreground" aria-hidden />
                  Dashboard
                </SheetClose>
              </li>
            ) : null}
          </ul>

          <div className="mt-5 border-t pt-4">
            <p className="mb-2 flex items-center gap-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <LayoutGrid size={13} aria-hidden />
              Categories
            </p>
            <ul className="space-y-0.5">
              {categories.map((category) => (
                <li key={category.id}>
                  <SheetClose
                    render={
                      <Link
                        href={`/categories/${category.slug}`}
                        className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      />
                    }
                  >
                    {category.name}
                  </SheetClose>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-5 border-t pt-4">
            <SheetClose
              render={
                <Link
                  href="/sell"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-muted"
                />
              }
            >
              <Tag size={16} aria-hidden />
              Sell on Nexus Market
            </SheetClose>
          </div>
        </div>

        <div className="border-t p-4">
          {user ? (
            <SignOutButton className="w-full" />
          ) : (
            <div className="flex gap-2">
              <SheetClose
                render={
                  <Link
                    href="/login"
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition hover:bg-muted"
                  />
                }
              >
                Sign in
              </SheetClose>
              <SheetClose
                render={
                  <Link
                    href="/register"
                    className="inline-flex h-9 flex-1 items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                  />
                }
              >
                Create account
              </SheetClose>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
