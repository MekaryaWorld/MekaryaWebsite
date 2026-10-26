import { randomInt } from "node:crypto";
import db from "../db.server";

// No 0/O/1/I/L so codes are easy to read over the phone.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function randomCode(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return `MK-${out}`;
}

export async function generateUniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = randomCode();
    const existing = await db.build.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique build code");
}

export function normalizeCode(code: string): string {
  const cleaned = code.trim().toUpperCase().replace(/\s+/g, "");
  return cleaned.startsWith("MK-") ? cleaned : `MK-${cleaned.replace(/^MK/, "")}`;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
