import "server-only";
import { randomInt } from "node:crypto";
import { getCollections } from "@/lib/db/mongo";
import { RESERVED_USERNAMES, USERNAME_RE } from "./account";

/** "Maria José Silva" / "maria.jose@x.com" → "maria_jose_silva" (a–z, 0–9, _). */
export function slugUsername(source: string): string {
  const base = source
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/@.*$/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
  return base.length >= 3 ? base : `${base || "viajante"}_${randomInt(100, 999)}`.slice(0, 24);
}

/** A free username derived from the name (or email), with a numeric suffix when taken. */
export async function uniqueUsername(name: string, email: string): Promise<string> {
  const { users } = await getCollections();
  const base = slugUsername(name || email);
  const candidates = [base, ...Array.from({ length: 6 }, () => `${base.slice(0, 24)}_${randomInt(10, 9999)}`)];
  for (const c of candidates) {
    if (USERNAME_RE.test(c) && !RESERVED_USERNAMES.has(c) && !(await users.findOne({ username: c }, { projection: { _id: 1 } }))) return c;
  }
  return `viajante_${randomInt(100000, 999999)}`;
}
