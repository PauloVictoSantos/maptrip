import "server-only";
import { GridFSBucket, MongoClient, ObjectId, type Db } from "mongodb";
import type {
  CommentDoc,
  FollowDoc,
  LikeDoc,
  PasswordResetDoc,
  PlaceDoc,
  PlaceStatusDoc,
  PostDoc,
  TripDoc,
  UserDoc,
} from "./types";

// One client per server process (kept on globalThis so dev hot-reload doesn't leak connections).
const globalForMongo = globalThis as unknown as {
  _mongoClient?: Promise<MongoClient>;
  _mongoIndexes?: Promise<void>;
};

function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI não está configurada (veja .env.example).");
  globalForMongo._mongoClient ??= new MongoClient(uri, { appName: "maptrip" }).connect().catch((err) => {
    globalForMongo._mongoClient = undefined;
    throw err;
  });
  return globalForMongo._mongoClient;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { username: 1 }, unique: true },
      { key: { google_sub: 1 }, unique: true, partialFilterExpression: { google_sub: { $type: "string" } } },
    ]),
    db.collection("password_resets").createIndexes([
      { key: { token_hash: 1 }, unique: true },
      { key: { user_id: 1 } },
      { key: { expires_at: 1 }, expireAfterSeconds: 0 },
    ]),
    db.collection("posts").createIndexes([
      { key: { location: "2dsphere" } },
      { key: { user_id: 1, created_at: -1 } },
      { key: { visibility: 1, created_at: -1 } },
      { key: { category: 1 } },
      { key: { place_name: "text", title: "text", description: "text" }, default_language: "portuguese" },
    ]),
    db.collection("comments").createIndex({ post_id: 1, created_at: 1 }),
    db.collection("likes").createIndexes([
      { key: { user_id: 1, post_id: 1 }, unique: true },
      { key: { post_id: 1 } },
    ]),
    db.collection("follows").createIndexes([
      { key: { follower_id: 1, following_id: 1 }, unique: true },
      { key: { following_id: 1 } },
      // Paginated follower / following lists (newest first, _id cursor).
      { key: { following_id: 1, _id: -1 } },
      { key: { follower_id: 1, _id: -1 } },
    ]),
    db.collection("places").createIndexes([{ key: { location: "2dsphere" } }, { key: { name: 1 } }]),
    db.collection("place_status").createIndexes([
      { key: { user_id: 1, place_id: 1 }, unique: true },
      { key: { user_id: 1, status: 1, updated_at: -1 } },
    ]),
    db.collection("trips").createIndex({ members: 1, start_date: -1 }),
    db.collection("comments").createIndex({ user_id: 1, created_at: -1 }),
  ]);
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const db = client.db(process.env.MONGODB_DB || "maptrip");
  globalForMongo._mongoIndexes ??= ensureIndexes(db).catch((err) => {
    globalForMongo._mongoIndexes = undefined;
    throw err;
  });
  await globalForMongo._mongoIndexes;
  return db;
}

export async function getCollections() {
  const db = await getDb();
  return {
    db,
    users: db.collection<UserDoc>("users"),
    posts: db.collection<PostDoc>("posts"),
    comments: db.collection<CommentDoc>("comments"),
    likes: db.collection<LikeDoc>("likes"),
    follows: db.collection<FollowDoc>("follows"),
    places: db.collection<PlaceDoc>("places"),
    placeStatus: db.collection<PlaceStatusDoc>("place_status"),
    trips: db.collection<TripDoc>("trips"),
    passwordResets: db.collection<PasswordResetDoc>("password_resets"),
    media: new GridFSBucket(db, { bucketName: "media" }),
  };
}

/** Parses a hex id; returns null for anything that isn't a valid ObjectId. */
export function toObjectId(id: unknown): ObjectId | null {
  return typeof id === "string" && /^[a-f0-9]{24}$/i.test(id) ? new ObjectId(id) : null;
}

export function isDuplicateKey(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;
}
