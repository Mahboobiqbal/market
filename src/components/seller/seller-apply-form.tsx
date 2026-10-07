"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  submitSellerApplicationAction,
  type SellerApplyState,
} from "@/actions/seller.actions";

const IDLE: SellerApplyState = { status: "idle" };

export function SellerApplyForm({ rejected }: { rejected?: boolean }) {
  const [state, action, pending] = useActionState<SellerApplyState, FormData>(
    submitSellerApplicationAction,
    IDLE,
  );

  if (state.status === "success") {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {rejected ? (
        <Alert>
          <AlertDescription>
            Your previous application was rejected — you can apply again with updated details.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="businessName">Business / brand name *</Label>
        <Input
          id="businessName"
          name="businessName"
          required
          minLength={3}
          maxLength={120}
          placeholder="Ayesha Crafts"
        />
        {state.errors?.businessName && (
          <p className="text-sm text-destructive">{state.errors.businessName[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="businessType">Business type *</Label>
        <select
          id="businessType"
          name="businessType"
          required
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          defaultValue="INDIVIDUAL"
        >
          <option value="INDIVIDUAL">Individual / sole proprietor</option>
          <option value="REGISTERED_COMPANY">Registered company</option>
          <option value="OTHER">Other</option>
        </select>
        {state.errors?.businessType && (
          <p className="text-sm text-destructive">{state.errors.businessType[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnic">CNIC *</Label>
        <Input
          id="cnic"
          name="cnic"
          required
          inputMode="numeric"
          placeholder="12345-1234567-1"
          pattern="\d{5}-\d{7}-\d"
          title="Format: 12345-1234567-1"
        />
        {state.errors?.cnic && (
          <p className="text-sm text-destructive">{state.errors.cnic[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input
          id="phone"
          name="phone"
          required
          inputMode="tel"
          placeholder="0300-1234567"
          pattern="(\+92|0)?3\d{2}[-\s]?\d{7}"
          title="Enter a valid Pakistani phone number"
        />
        {state.errors?.phone && (
          <p className="text-sm text-destructive">{state.errors.phone[0]}</p>
        )}
      </div>

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
