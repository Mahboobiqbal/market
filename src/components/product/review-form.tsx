"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";
import { submitReviewAction, type ReviewState } from "@/actions/review.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const IDLE: ReviewState = { status: "idle" };

export function ReviewForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReviewAction, IDLE);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);

  if (state.status === "success") {
    return (
      <Alert>
        <AlertDescription>{state.message}</AlertDescription>
      </Alert>
    );
  }

  const display = hovered || rating;

  return (
    <form action={action} className="space-y-4 rounded-2xl border bg-card p-5">
      <div>
        <p className="font-medium">Write a review</p>
        <p className="text-sm text-muted-foreground">
          Your review appears after a quick moderation check.
        </p>
      </div>

      {state.message && state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />

      <div className="space-y-1.5">
        <Label>Your rating *</Label>
        <div className="flex items-center gap-1" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
              className="transition hover:scale-110"
            >
              <Star
                size={22}
                className={cn(
                  "transition",
                  star <= display ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
        {state.errors?.rating && (
          <p className="text-sm text-destructive">{state.errors.rating[0]}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-title">Title</Label>
        <Input id="review-title" name="title" maxLength={120} placeholder="Sums it up in a line" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Review</Label>
        <textarea
          id="review-comment"
          name="comment"
          rows={4}
          maxLength={2000}
          placeholder="What did you like or dislike?"
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      <Button type="submit" disabled={pending || rating === 0}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
