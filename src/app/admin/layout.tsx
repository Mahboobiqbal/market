import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="font-semibold tracking-tight">
            {brand.appName}
          </Link>
          <Badge>Admin</Badge>
          <nav className="ml-auto flex items-center gap-1">
            <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
              View storefront
            </Link>
            <SignOutButton />
          </nav>
        </div>
        <div className="border-t">
          <nav className="mx-auto flex w-full max-w-7xl gap-1 px-4 sm:px-6">
            <Link
              href="/admin"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-b-none border-b-2 border-transparent",
              )}
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
