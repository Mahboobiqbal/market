"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { signIn } from "@/lib/auth";
import { hashPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db/prisma";

export type FormErrors = {
  name?: string[];
  email?: string[];
  password?: string[];
};

export type FormState =
  | { error?: string; fieldErrors?: FormErrors; success?: boolean }
  | undefined;

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(80, { error: "Name must be 80 characters or fewer." }),
  email: z.email({ error: "Enter a valid email address." }),
  password: z
    .string()
    .min(8, { error: "Password must be at least 8 characters." })
    .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
    .regex(/[0-9]/, { error: "Password must contain a number." }),
});

const loginSchema = z.object({
  email: z.email({ error: "Enter a valid email address." }),
  password: z.string().min(1, { error: "Password is required." }),
});

function safeCallbackUrl(value: FormDataEntryValue | null): string {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  ) {
    return value;
  }
  return "/";
}

function fieldErrorsFrom(error: z.ZodError): FormErrors {
  const fieldErrors: FormErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "name" || key === "email" || key === "password") {
      (fieldErrors[key] ??= []).push(issue.message);
    }
  }
  return fieldErrors;
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }
  return { success: true };
}

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  if (parsed.data.password !== formData.get("confirm")) {
    return { fieldErrors: { password: ["Passwords do not match."] } };
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    await prisma.user.create({
      data: { name: parsed.data.name, email, passwordHash, role: "CUSTOMER" },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with this email already exists." };
    }
    throw error;
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Please log in instead." };
    }
    throw error;
  }
  return { success: true };
}
