import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { ObjectId } from "mongodb";
import { SESSION_COOKIE, SESSION_DAYS, signSession, verifySession } from "./jwt";
import { toObjectId } from "@/lib/db/mongo";

/** The signed-in user's id (from the session cookie), or null. */
export async function getViewerId(): Promise<ObjectId | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return toObjectId(await verifySession(token));
}

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function setSessionCookie(res: NextResponse, userId: string) {
  res.cookies.set(SESSION_COOKIE, await signSession(userId), { ...cookieBase, maxAge: SESSION_DAYS * 86400 });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
}
