import { NextResponse } from "next/server";
import { getCollections } from "@/lib/db/mongo";
import { clearSessionCookie, getViewerId } from "@/lib/auth/session";
import { ownProfile } from "@/lib/auth/account";

// GET /api/auth/me — current session
export async function GET() {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ user: null, profile: null });

  const { users } = await getCollections();
  const user = await users.findOne({ _id: viewer });
  if (!user) {
    // Account removed: drop the stale cookie
    const res = NextResponse.json({ user: null, profile: null });
    clearSessionCookie(res);
    return res;
  }
  return NextResponse.json({ user: { id: user._id.toHexString(), email: user.email }, profile: ownProfile(user) });
}
