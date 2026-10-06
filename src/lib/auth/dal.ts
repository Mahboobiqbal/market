import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import type { Role } from "@/generated/prisma/enums";
import { homeForRole } from "@/lib/permissions";
import { auth } from "./index";

export type SessionUser = Session["user"];

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(homeForRole(user.role));
  }
  return user;
}
