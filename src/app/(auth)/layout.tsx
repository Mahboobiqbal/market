import Link from "next/link";
import { brand } from "@/config/brand";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 dark:bg-muted/20">
      <Link href="/" className="mb-8 text-2xl font-semibold tracking-tight">
        {brand.appName}
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 max-w-md text-center text-sm text-muted-foreground">
        By continuing you agree to the marketplace terms of service and privacy policy.
      </p>
    </div>
  );
}
