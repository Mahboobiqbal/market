import type { Metadata } from "next";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: "Your account",
};

const roleLabels: Record<string, string> = {
  CUSTOMER: "Customer",
  SELLER: "Seller",
  SUPER_ADMIN: "Administrator",
};

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your basic account details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="font-medium">{user.name ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="font-medium">{user.email ?? "—"}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd>
                <Badge variant="secondary">{roleLabels[user.role] ?? user.role}</Badge>
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Email verified</dt>
              <dd className="font-medium">{user.emailVerified ? "Yes" : "Not yet"}</dd>
            </div>
          </dl>

          <SignOutButton variant="outline" />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Orders &amp; addresses</CardTitle>
          <CardDescription>
            Order history, saved addresses, and reviews arrive in a later phase of the build.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
