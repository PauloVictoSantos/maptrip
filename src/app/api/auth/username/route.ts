import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { USERNAME_RE } from "@/lib/auth/account";

// GET /api/auth/username?u=<username> — availability check for sign-up
export async function GET(request: NextRequest) {
  const username = (request.nextUrl.searchParams.get("u") ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) return NextResponse.json({ available: false, valid: false });
  const { users } = await getCollections();
  const exists = await users.countDocuments({ username }, { limit: 1 });
  return NextResponse.json({ available: exists === 0, valid: true });
}
