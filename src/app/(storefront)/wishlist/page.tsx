import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { EmptyState } from "@/components/shared/empty-state";
import { getSessionUser } from "@/lib/auth/dal";
import { listWishlist } from "@/services/wishlist.service";

export const metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={Heart}
          title="Save items for later"
          description="Sign in to build a wishlist and sync it across devices."
          action={{ href: "/login?callbackUrl=/wishlist", label: "Sign in" }}
        />
      </div>
    );
  }

  const items = await listWishlist(user.id);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Wishlist</h1>
        <p className="text-sm text-muted-foreground">
          {items.length} saved item{items.length === 1 ? "" : "s"}
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Heart}
          title="No saved items yet"
          description="Tap the heart on any product to save it here."
          action={{ href: "/products", label: "Browse products" }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} wishlisted />
          ))}
        </div>
      )}
    </div>
  );
}
