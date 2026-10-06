import type { DefaultSession } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      emailVerified: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    emailVerified: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: Role;
    emailVerified?: boolean;
  }
}
