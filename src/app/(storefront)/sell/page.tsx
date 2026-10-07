import Link from "next/link";
import { Banknote, BarChart3, ShieldCheck, Store } from "lucide-react";
import { SellerApplyForm } from "@/components/seller/seller-apply-form";
import { StatusBadge } from "@/components/shared/status-badge";
import { getSessionUser } from "@/lib/auth/dal";
import { getPlatformSettings } from "@/services/settings.service";
import { getSellerContext } from "@/services/seller.service";
import { formatBps } from "@/lib/utils/format";

const benefits = [
  {
    icon: Store,
    title: "Your own storefront",
    description: "A branded shop page, product catalog, and reviews — all yours.",
  },
  {
    icon: BarChart3,
    title: "Seller dashboard",
    description: "Track orders, inventory, earnings, and payouts in real time.",
  },
  {
    icon: Banknote,
    title: "Flexible payouts",
    description: "Request payouts once your earnings become available.",
  },
  {
    icon: ShieldCheck,
    title: "We handle trust",
    description: "Buyer protection, secure payments, and dispute support built in.",
  },
] as const;

const statusMeta: Record<string, { label: string; tone: "warning" | "success" | "danger" | "info" | "neutral" }> = {
  PENDING: { label: "Under review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

export default async function SellPage() {
  const user = await getSessionUser();
  const settings = await getPlatformSettings();
  const profile = user ? await getSellerContext(user.id) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">Sell on Nexus Market</p>
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Open your store in minutes
            </h1>
            <p className="max-w-lg text-muted-foreground">
              Submit a quick application, get reviewed by our team, and start listing products.
              Commission is just {formatBps(settings.defaultCommissionBps)} per order — no
              upfront fees.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {benefits.map((item) => (
              <li key={item.title} className="rounded-2xl border bg-card p-4">
                <item.icon size={18} className="mb-2 text-primary" aria-hidden />
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              </li>
            ))}
          </ul>

          <ol className="space-y-3 text-sm text-muted-foreground">
            {[
              "Submit your business details (CNIC + phone).",
              "Our team reviews the application within 1–2 business days.",
              "Create your shop and submit products for approval.",
              "Start selling — payouts land in your balance.",
            ].map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-3xl border bg-card p-6 sm:p-8">
          {!user ? (
            <div className="flex flex-col items-start gap-4 py-6">
              <p className="text-lg font-semibold">Ready to start?</p>
              <p className="text-sm text-muted-foreground">
                Create an account (or sign in) to submit your seller application.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
                >
                  Create account
                </Link>
                <Link
                  href="/login?callbackUrl=/sell"
                  className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  Sign in
                </Link>
              </div>
            </div>
          ) : profile && !["NOT_APPLIED", "REJECTED"].includes(profile.applicationStatus) ? (
            <div className="space-y-4 py-6">
              <div className="flex items-center gap-3">
                <p className="text-lg font-semibold">Application status</p>
                <StatusBadge
                  label={statusMeta[profile.applicationStatus]?.label ?? profile.applicationStatus}
                  tone={statusMeta[profile.applicationStatus]?.tone ?? "neutral"}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.applicationStatus === "PENDING"
                  ? "Thanks! Our team is reviewing your application. You'll be notified once it's decided."
                  : "You're approved to sell. Head to your seller dashboard to manage your store."}
              </p>
              <Link
                href={profile.applicationStatus === "APPROVED" ? "/seller" : "/account"}
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {profile.applicationStatus === "APPROVED" ? "Open seller dashboard" : "Back to account"}
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-lg font-semibold">Seller application</p>
                <p className="text-sm text-muted-foreground">
                  Fields marked * are required.
                </p>
              </div>
              <SellerApplyForm rejected={profile?.applicationStatus === "REJECTED"} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
