import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { getCollections, toObjectId } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { publicUser } from "@/lib/db/access";
import { normalize } from "@/lib/search";
import { rateLimit } from "@/lib/rate-limit";
import type { UserDoc } from "@/lib/db/types";
import type { UserSearchResponse } from "@/lib/people";

const MAX_Q = 50;

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// "jose" also matches "José": each vowel/ç becomes a class with its accented forms.
const ACCENTS: Record<string, string> = { a: "aáàâãä", e: "eéèêë", i: "iíìîï", o: "oóòôõö", u: "uúùûü", c: "cç", n: "nñ" };
function accentInsensitive(term: string) {
  return [...normalize(term)].map((ch) => (ACCENTS[ch] ? `[${ACCENTS[ch]}]` : escapeRegex(ch))).join("");
}

// GET /api/users/search?q=<nome | @usuario | id>&limit=8
export async function GET(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Entre na sua conta para buscar pessoas." }, { status: 401 });
  if (!rateLimit(`user-search:${viewer.toHexString()}`, 90, 60 * 1000)) {
    return NextResponse.json({ error: "Muitas buscas seguidas. Aguarde alguns segundos." }, { status: 429 });
  }

  const sp = request.nextUrl.searchParams;
  const raw = (sp.get("q") ?? "").trim().slice(0, MAX_Q);
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "8", 10) || 8, 1), 20);
  const empty: UserSearchResponse = { users: [] };
  if (!raw) return NextResponse.json(empty);

  const { users, follows } = await getCollections();
  const id = toObjectId(raw);
  const handle = raw.replace(/^@/, "").toLowerCase();
  const or: Filter<UserDoc>[] = [];

  if (id) or.push({ _id: id }); // exact user id
  if (/^[a-z0-9_]{1,30}$/.test(handle)) or.push({ username: { $regex: `^${escapeRegex(handle)}` } }); // prefix (uses the unique index)
  if (!raw.startsWith("@") && normalize(raw).length >= 2) {
    // Any word of the display name starting with the term, ignoring case and accents.
    or.push({ display_name: { $regex: `(^|\\s)${accentInsensitive(raw)}`, $options: "i" } });
  }
  if (!or.length) return NextResponse.json(empty);

  const rows = await users
    .find({ $or: or }, { projection: { username: 1, display_name: 1, avatar_url: 1, city: 1 } })
    .limit(40)
    .toArray();

  // Rank: exact id/username, username prefix, name prefix, other name matches; then by name.
  const q = normalize(raw.replace(/^@/, ""));
  const rank = (u: (typeof rows)[number]) => {
    if (id && u._id.equals(id)) return 0;
    if (u.username === handle) return 0;
    if (u.username.startsWith(handle)) return 1;
    if (normalize(u.display_name ?? "").startsWith(q)) return 2;
    return 3;
  };
  const sorted = rows
    .sort((a, b) => rank(a) - rank(b) || (a.display_name ?? a.username).localeCompare(b.display_name ?? b.username, "pt-BR"))
    .slice(0, limit);

  const ids = sorted.map((u) => u._id);
  const [iFollow, followMe] = await Promise.all([
    ids.length ? follows.find({ follower_id: viewer, following_id: { $in: ids } }, { projection: { following_id: 1 } }).toArray() : [],
    ids.length ? follows.find({ follower_id: { $in: ids }, following_id: viewer }, { projection: { follower_id: 1 } }).toArray() : [],
  ]);
  const a = new Set(iFollow.map((f) => f.following_id.toHexString()));
  const b = new Set(followMe.map((f) => f.follower_id.toHexString()));

  const body: UserSearchResponse = {
    users: sorted.map((u) => ({
      ...publicUser(u),
      city: u.city ?? null,
      is_me: u._id.equals(viewer),
      is_following: a.has(u._id.toHexString()),
      follows_you: b.has(u._id.toHexString()),
    })),
  };
  return NextResponse.json(body);
}
