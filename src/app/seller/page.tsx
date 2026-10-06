import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/dal";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Seller dashboard",
};

const placeholders = [
  { title: "Products", description: "Listings, stock levels, and reviews land here." },
  { title: "Orders", description: "New and in-progress orders to fulfil." },
  { title: "Revenue", description: "Sales totals and commission breakdown." },
  { title: "Payouts", description: "Payout requests and payment history." },
];

export default async function SellerDashboardPage() {
  const user = await requireRole("SELLER", "SUPER_ADMIN");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your seller workspace. Management tools arrive in the next build phase.
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
