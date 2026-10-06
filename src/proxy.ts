import { NextResponse, type NextRequest } from "next/server";
import { decode } from "next-auth/jwt";
import type { Role } from "@/generated/prisma/enums";
import { homeForRole } from "@/lib/permissions";

const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

async function readSession(request: NextRequest) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  for (const name of SESSION_COOKIES) {
    const token = request.cookies.get(name)?.value;
    if (!token) continue;
    try {
      const payload = await decode({ token, secret, salt: name });
      if (payload?.sub) return payload;
    } catch {
      // Fall through to the next candidate cookie name.
    }
  }
  return null;
}

function sectionOf(pathname: string): "admin" | "seller" | "account" | "auth" | "public" {
  if (pathname === "/login" || pathname === "/register") return "auth";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/seller" || pathname.startsWith("/seller/")) return "seller";
  if (pathname === "/account" || pathname.startsWith("/account/")) return "account";
  return "public";
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const section = sectionOf(pathname);
  if (section === "public") return NextResponse.next();

  const session = await readSession(request);
  const signedIn = Boolean(session?.sub);
  const role = session?.role as Role | undefined;

  // Keep authenticated users away from the auth pages.
  if (section === "auth") {
    if (signedIn && role) {
      return NextResponse.redirect(new URL(homeForRole(role), request.nextUrl));
    }
    return NextResponse.next();
  }

  // /admin, /seller, /account require a session (optimistic check only —
  // real authorization happens in the Data Access Layer near the data).
  if (!signedIn || !role) {
    const url = new URL("/login", request.nextUrl);
    url.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(url);
  }

  if (section === "admin" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(role), request.nextUrl));
  }

  if (section === "seller" && role !== "SELLER" && role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL(homeForRole(role), request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/seller/:path*", "/account/:path*", "/login", "/register"],
};
