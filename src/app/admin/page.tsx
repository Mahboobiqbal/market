import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin dashboard",
};

const placeholders = [
  { title: "Users", description: "Customers, sellers, and staff accounts." },
  { title: "Sellers", description: "Applications, shops, and suspensions." },
  { title: "Orders", description: "Marketplace-wide orders, returns, and refunds." },
  { title: "Finance", description: "Commissions, payouts, and platform settings." },
];

export default async function AdminDashboardPage() {
  const user = await requireRole("SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform overview. Moderation, finance, and settings tools arrive in the next build phase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {placeholders.map((item) => (
          <Card key={item.title}>
            <CardHeader>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
