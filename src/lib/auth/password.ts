import "server-only";
import { compare, hash } from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  return compare(plain, storedHash);
}
