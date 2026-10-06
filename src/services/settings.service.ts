import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db/prisma";

/**
 * Platform-wide settings stored under the `platform` key.
 * Reads are cached per-request; writes go through admin actions only.
 */

export type PlatformSettings = {
  currency: string;
  /** Global commission in basis points (1000 = 10%). */
  defaultCommissionBps: number;
  codEnabled: boolean;
  onlinePaymentsEnabled: boolean;
  /** Platform tax in basis points (0 = none). */
  taxBps: number;
  /** Flat delivery fee per seller order, minor units. */
  shippingPerSeller: number;
  /** Seller-order subtotal (minor units) above which shipping is waived. */
  freeShippingOver: number;
  /** Minimum payout request amount, minor units. */
  minPayoutRequest: number;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  currency: "PKR",
  defaultCommissionBps: 1000,
  codEnabled: true,
  onlinePaymentsEnabled: true,
  taxBps: 0,
  shippingPerSeller: 20000,
  freeShippingOver: 3000000,
  minPayoutRequest: 500000,
};

function coerce(raw: Record<string, unknown>): PlatformSettings {
  const out: PlatformSettings = { ...DEFAULT_PLATFORM_SETTINGS };
  const cell = out as Record<string, boolean | number | string>;
  for (const key of Object.keys(DEFAULT_PLATFORM_SETTINGS) as (keyof PlatformSettings)[]) {
    const value = raw[key];
    const fallback = DEFAULT_PLATFORM_SETTINGS[key];
    if (typeof fallback === "boolean") {
      if (typeof value === "boolean") cell[key] = value;
    } else if (typeof fallback === "number") {
      if (typeof value === "number" && Number.isFinite(value)) cell[key] = value;
    } else if (typeof fallback === "string") {
      if (typeof value === "string" && value) cell[key] = value;
    }
  }
  return out;
}

export const getPlatformSettings = cache(async (): Promise<PlatformSettings> => {
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: "platform" } });
    if (!row || typeof row.value !== "object" || row.value === null) {
      return DEFAULT_PLATFORM_SETTINGS;
    }
    return coerce(row.value as Record<string, unknown>);
  } catch {
    return DEFAULT_PLATFORM_SETTINGS;
  }
});

/** Admin-only: merge partial settings into the stored JSON. */
export async function updatePlatformSettings(input: Partial<PlatformSettings>): Promise<void> {
  const current = await getPlatformSettings();
  const next: PlatformSettings = { ...current, ...input };
  await prisma.platformSetting.upsert({
    where: { key: "platform" },
    update: { value: next },
    create: {
      key: "platform",
      value: next,
      description: "Global platform defaults (commission, currency, payments, shipping, payouts).",
    },
  });
}
