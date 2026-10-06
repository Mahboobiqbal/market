import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { AddressType } from "@/generated/prisma/enums";

/** Customer addresses — strictly scoped to their owner. */

export type AddressInput = {
  type: AddressType;
  label?: string | null;
  line1: string;
  line2?: string | null;
  city: string;
  region: string;
  postalCode: string;
  country?: string;
  phone?: string | null;
  isDefault?: boolean;
};

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getAddress(userId: string, id: string) {
  return prisma.address.findFirst({ where: { id, userId } });
}

export async function getDefaultAddress(userId: string) {
  return prisma.address.findFirst({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

async function clearDefault(userId: string, tx: Prisma.TransactionClient) {
  await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
}

export async function createAddress(userId: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    if (input.isDefault) await clearDefault(userId, tx);
    const count = await tx.address.count({ where: { userId } });
    return tx.address.create({
      data: {
        userId,
        type: input.type,
        label: input.label ?? null,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country ?? "PK",
        phone: input.phone ?? null,
        isDefault: input.isDefault ?? count === 0,
      },
    });
  });
}

export async function updateAddress(userId: string, id: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({ where: { id, userId } });
    if (!existing) throw new Error("Address not found.");
    if (input.isDefault) await clearDefault(userId, tx);
    return tx.address.update({
      where: { id },
      data: {
        type: input.type,
        label: input.label ?? null,
        line1: input.line1,
        line2: input.line2 ?? null,
        city: input.city,
        region: input.region,
        postalCode: input.postalCode,
        country: input.country ?? "PK",
        phone: input.phone ?? null,
        isDefault: input.isDefault ?? existing.isDefault,
      },
    });
  });
}

export async function deleteAddress(userId: string, id: string): Promise<void> {
  await prisma.address.deleteMany({ where: { id, userId } });
}
