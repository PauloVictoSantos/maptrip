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

/** remember=false → browser-session cookie and a short token (see SHORT_SESSION_HOURS). */
export async function setSessionCookie(res: NextResponse, userId: string, remember = true) {
  const token = await signSession(userId, remember);
  res.cookies.set(SESSION_COOKIE, token, remember ? { ...cookieBase, maxAge: SESSION_DAYS * 86400 } : cookieBase);
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", { ...cookieBase, maxAge: 0 });
}
