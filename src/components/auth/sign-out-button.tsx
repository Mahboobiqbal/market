import type { VariantProps } from "class-variance-authority";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

export function SignOutButton({
  className,
  variant = "ghost",
}: {
  className?: string;
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <form action={signOutAction}>
      <Button type="submit" variant={variant} className={className}>
        Sign out
      </Button>
    </form>
  );
}
