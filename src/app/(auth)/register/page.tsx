import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Create account",
};

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const { callbackUrl } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Join the marketplace as a customer in a few seconds.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm callbackUrl={callbackUrl} />
      </CardContent>
    </Card>
  );
}
