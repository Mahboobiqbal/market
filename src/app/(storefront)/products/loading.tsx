import { ProductGridSkeleton } from "@/components/shared/skeletons";

export default function ProductsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="mb-6 h-8 w-56 rounded-lg bg-muted animate-pulse" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="hidden w-60 shrink-0 space-y-4 lg:block">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />
          ))}
        </aside>
        <div className="flex-1">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
