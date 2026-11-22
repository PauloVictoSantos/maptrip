#!/usr/bin/env node
// Popula o MongoDB com 10 pessoas e ~85 visitas em Manaus (com fotos ilustradas).
//
//   node scripts/seed-manaus.mjs --me <seu username ou email>
//   node scripts/seed-manaus.mjs --avatars   (só (re)gera as fotos de perfil das pessoas do seed)
//
// - 5 pessoas viram suas amigas (vocês se seguem), 5 não.
// - Pode rodar de novo: os dados anteriores do seed são apagados antes.
//   Só toca em documentos marcados com `seed: true` (e nos follows com você).
// - Senha de todas as contas criadas: maptrip123

import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { GridFSBucket, MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { COMMENTS, PLACES, SEED_FOLLOWS, USERS } from "./seed/data.mjs";
import { makeRng, renderScene } from "./seed/scenes.mjs";
import { renderAvatar } from "./seed/avatars.mjs";

const SEED_PASSWORD = "maptrip123";
const SEED_EMAIL_DOMAIN = "seed.maptrip.dev";
const DAY = 86400000;

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Questionnaire (mirrors src/lib/questions.ts)
// ---------------------------------------------------------------------------
const Q = {
  restaurante: [
    ["tem_banheiro", "b"], ["atendimento", "s"], ["tem_estacionamento", "b"], ["aceita_cartao", "b"], ["aceita_pix", "b"],
    ["tem_wifi", "b"], ["faixa_preco", "c", ["$", "$$", "$$$", "$$$$"]], ["bom_para_criancas", "b"], ["tem_opcao_vegetariana", "b"],
    ["aceita_pet", "b"], ["tem_delivery", "b"], ["ambiente", "s"], ["tempo_espera", "b"], ["melhor_horario", "c", ["manha", "tarde", "noite"]],
  ],
  praia: [
    ["tem_quiosque", "b"], ["tem_banheiro", "b"], ["acesso_facil", "s"], ["tem_estacionamento", "b"], ["agua_limpa", "s"],
    ["tem_sombra", "b"], ["movimentada", "b"], ["boa_para_criancas", "b"], ["aceita_pet", "b"], ["tem_aluguel_cadeiras", "b"],
    ["melhor_epoca", "c", ["seca", "chuva", "qualquer"]],
  ],
  hotel: [
    ["cafe_incluso", "b"], ["tem_piscina", "b"], ["limpeza", "s"], ["tem_wifi", "b"], ["tem_estacionamento", "b"],
    ["check_in_facil", "b"], ["aceita_pet", "b"], ["tem_ar_condicionado", "b"], ["vista", "s"], ["faixa_preco", "c", ["$", "$$", "$$$", "$$$$"]],
  ],
  default: [["tem_banheiro", "b"], ["tem_estacionamento", "b"], ["aceita_cartao", "b"], ["acessibilidade", "b"]],
};

const TRAIT_FOR = {
  tem_banheiro: "banheiro", tem_estacionamento: "parking", aceita_cartao: "card", tem_wifi: "wifi",
  bom_para_criancas: "kids", boa_para_criancas: "kids", tem_opcao_vegetariana: "veg", aceita_pet: "pet",
  acessibilidade: "acc", cafe_incluso: "breakfast", tem_piscina: "pool", tem_ar_condicionado: "ac",
  faixa_preco: "price", melhor_horario: "best", melhor_epoca: "season",
};

// How thorough each person is when filling the questionnaire (0–1), and keys they always answer.
const DILIGENCE = {
  caio: [0.5], bia: [0.4], rafa: [0.75], marina: [0.6, ["tem_opcao_vegetariana"]], joao: [0.5, ["bom_para_criancas", "boa_para_criancas"]],
  larissa: [0.6], thiago: [0.3], fernanda: [0.85], gabriel: [0.2], carol: [0.9, ["acessibilidade"]],
};

function answersFor(place, userKey, r) {
  const questions = Q[place.cat] ?? Q.default;
  const [diligence, always = []] = DILIGENCE[userKey] ?? [0.4];
  if (r() < 0.15 && !always.length) return {}; // some people skip it entirely
  const t = place.traits ?? {};
  const quality = t.quality ?? 4;
  const out = {};
  for (const [key, type, choices] of questions) {
    if (!always.includes(key) && r() > diligence) continue;
    const trait = t[TRAIT_FOR[key]];
    if (type === "b") {
      let yes =
        key === "tempo_espera" || key === "check_in_facil" ? quality >= 4
        : key === "aceita_pix" ? true
        : trait === undefined ? r() < 0.6
        : !!trait;
      if (r() < 0.1) yes = !yes; // people disagree sometimes
      out[key] = yes ? "sim" : "nao";
    } else if (type === "s") {
      out[key] = String(Math.min(5, Math.max(1, Math.round(quality + (r() - 0.5) * 2))));
    } else {
      out[key] = trait && choices.includes(trait) && r() > 0.15 ? trait : choices[Math.floor(r() * choices.length)];
    }
  }
  return out;
}

async function uploadJpeg(bucket, buffer, filename, metadata) {
  const upload = bucket.openUploadStream(filename, { metadata: { contentType: "image/jpeg", seed: true, ...metadata } });
  await new Promise((res, rej) => Readable.from(buffer).pipe(upload).on("finish", res).on("error", rej));
  return `/api/media/${upload.id.toString()}`;
}

async function makeAvatar(bucket, key, userId) {
  const jpeg = await sharp(Buffer.from(renderAvatar(key))).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  return uploadJpeg(bucket, jpeg, `seed-avatar-${key}.jpg`, { owner: userId, avatar: true });
}

// ---------------------------------------------------------------------------
async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI não está configurada no .env / .env.local.");
    process.exit(1);
  }
  const client = await new MongoClient(uri, { appName: "maptrip-seed" }).connect();
  const db = client.db(process.env.MONGODB_DB || "maptrip");
  const users = db.collection("users");
  const posts = db.collection("posts");
  const comments = db.collection("comments");
  const likes = db.collection("likes");
  const follows = db.collection("follows");
  const placeStatus = db.collection("place_status");
  const bucket = new GridFSBucket(db, { bucketName: "media" });

  try {
    if (process.argv.includes("--avatars")) {
      const old = await bucket.find({ "metadata.seed": true, "metadata.avatar": true }).toArray();
      for (const f of old) await bucket.delete(f._id).catch(() => undefined);
      let n = 0;
      for (const u of USERS) {
        const doc = await users.findOne({ username: u.username, seed: true }, { projection: { _id: 1 } });
        if (!doc) continue;
        await users.updateOne({ _id: doc._id }, { $set: { avatar_url: await makeAvatar(bucket, u.key, doc._id), updated_at: new Date() } });
        n++;
      }
      console.log(n ? `✔ Fotos de perfil aplicadas em ${n} pessoas do seed.` : "Nenhuma pessoa do seed encontrada. Rode o seed completo primeiro.");
      return;
    }

    // ---- Who are you? -------------------------------------------------------
    const meArg = arg("me")?.trim().toLowerCase();
    const realUsers = await users.find({ seed: { $ne: true } }, { projection: { username: 1, email: 1 } }).toArray();
    let me = meArg ? realUsers.find((u) => u.username === meArg || u.email === meArg) : realUsers.length === 1 ? realUsers[0] : null;
    if (!me) {
      console.error(
        realUsers.length
          ? `Diga qual conta é a sua com --me <username ou email>. Contas encontradas:\n${realUsers.map((u) => `  - ${u.username} (${u.email})`).join("\n")}`
          : "Nenhuma conta encontrada. Crie sua conta no app (/register) e rode o seed de novo."
      );
      process.exit(1);
    }
    console.log(`Você: @${me.username}`);

    // ---- Clean previous seed --------------------------------------------------
    const oldSeed = await users.find({ seed: true }, { projection: { _id: 1 } }).toArray();
    const oldIds = oldSeed.map((u) => u._id);
    if (oldIds.length) {
      const oldPosts = await posts.find({ user_id: { $in: oldIds } }, { projection: { _id: 1 } }).toArray();
      const oldPostIds = oldPosts.map((p) => p._id);
      const files = await bucket.find({ "metadata.seed": true }).toArray();
      for (const f of files) await bucket.delete(f._id).catch(() => undefined);
      await Promise.all([
        posts.deleteMany({ _id: { $in: oldPostIds } }),
        comments.deleteMany({ $or: [{ user_id: { $in: oldIds } }, { post_id: { $in: oldPostIds } }] }),
        likes.deleteMany({ $or: [{ user_id: { $in: oldIds } }, { post_id: { $in: oldPostIds } }] }),
        follows.deleteMany({ $or: [{ follower_id: { $in: oldIds } }, { following_id: { $in: oldIds } }] }),
        placeStatus.deleteMany({ user_id: { $in: oldIds } }),
        users.deleteMany({ _id: { $in: oldIds } }),
      ]);
      console.log(`Seed anterior removido (${oldIds.length} pessoas, ${oldPostIds.length} visitas, ${files.length} fotos).`);
    }

    const now = Date.now();
    const r = makeRng(20261121);
    const pick = (list) => list[Math.floor(r() * list.length)];

    // ---- People ---------------------------------------------------------------
    const hash = await bcrypt.hash(SEED_PASSWORD, 10);
    const idOf = {};
    const userDocs = USERS.map((u, i) => {
      const _id = new ObjectId();
      idOf[u.key] = _id;
      const created = new Date(now - (200 + i * 9) * DAY);
      return {
        _id,
        email: `${u.username}@${SEED_EMAIL_DOMAIN}`,
        password_hash: hash,
        username: u.username,
        display_name: u.name,
        bio: u.bio,
        avatar_url: null,
        city: "Manaus, AM",
        created_at: created,
        updated_at: created,
        seed: true,
      };
    });
    await users.insertMany(userDocs);
    for (const u of USERS) {
      await users.updateOne({ _id: idOf[u.key] }, { $set: { avatar_url: await makeAvatar(bucket, u.key, idOf[u.key]) } });
    }

    // ---- Follows ----------------------------------------------------------------
    const followDocs = [];
    const follow = (a, b) => followDocs.push({ follower_id: a, following_id: b, created_at: new Date(now - Math.floor(r() * 90) * DAY) });
    for (const u of USERS) {
      if (u.friend) {
        follow(me._id, idOf[u.key]);
        follow(idOf[u.key], me._id);
      } else if (u.followsYou) {
        follow(idOf[u.key], me._id); // one-way: not a friend
      }
    }
    for (const [a, b] of SEED_FOLLOWS) follow(idOf[a], idOf[b]);
    await follows.insertMany(followDocs, { ordered: false }).catch((e) => {
      if (e.code !== 11000) throw e; // already following (re-runs)
    });

    // ---- Visits with photos ----------------------------------------------------
    const friendKeys = new Set(USERS.filter((u) => u.friend).map((u) => u.key));
    const postDocs = [];
    let photoCount = 0;
    let sceneSeed = 1;

    for (const place of PLACES) {
      for (const [userKey, rating, text, opts = {}] of place.reviews) {
        const daysAgo = opts.daysAgo ?? 3 + Math.floor(r() * 150);
        const created = new Date(now - daysAgo * DAY - Math.floor(r() * 12 * 3600000));
        const visit = new Date(created.getTime() - Math.floor(r() * 2) * DAY);
        const visibility = opts.visibility ?? (friendKeys.has(userKey) && r() < 0.12 ? "friends" : "public");
        const photos = opts.photos ?? (r() < 0.35 ? 1 : 0);
        const time = opts.time ?? (place.cat === "bar" ? "night" : pick(["day", "day", "morning", "sunset"]));

        const media = [];
        for (let i = 0; i < photos; i++) {
          const scene = place.scenes[i % place.scenes.length];
          const t = i === 0 ? time : pick(["day", "sunset", "night", "morning"]);
          const svg = renderScene(scene, sceneSeed++ * 7919, t);
          const jpeg = await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          const url = await uploadJpeg(bucket, jpeg, `seed-${place.name}-${i}.jpg`, { owner: idOf[userKey] });
          media.push({ url, order_index: i });
          photoCount++;
        }

        postDocs.push({
          _id: new ObjectId(),
          user_id: idOf[userKey],
          title: opts.title ?? place.name,
          description: text,
          rating,
          lat: place.lat + (r() - 0.5) * 0.0004,
          lng: place.lng + (r() - 0.5) * 0.0004,
          location: null, // set below
          place_name: place.name,
          category: place.cat,
          visibility,
          visit_date: visit.toISOString().slice(0, 10),
          media,
          answers: answersFor(place, userKey, r),
          likes_count: 0,
          comments_count: 0,
          created_at: created,
          _author: userKey,
        });
      }
      process.stdout.write(".");
    }
    console.log("");
    for (const p of postDocs) p.location = { type: "Point", coordinates: [p.lng, p.lat] };

    // ---- Likes & comments (only by people allowed to see the visit) ----------
    const mutual = (a, b) =>
      followDocs.some((f) => f.follower_id.equals(idOf[a]) && f.following_id.equals(idOf[b])) &&
      followDocs.some((f) => f.follower_id.equals(idOf[b]) && f.following_id.equals(idOf[a]));
    const canSee = (viewerKey, post) =>
      post.visibility === "public" || viewerKey === post._author || (post.visibility === "friends" && mutual(viewerKey, post._author));

    const likeDocs = [];
    const commentDocs = [];
    for (const post of postDocs) {
      const others = USERS.map((u) => u.key).filter((k) => k !== post._author && canSee(k, post));
      for (const k of others) {
        if (r() < 0.35) {
          likeDocs.push({ user_id: idOf[k], post_id: post._id, created_at: new Date(post.created_at.getTime() + Math.floor(r() * 48) * 3600000) });
          post.likes_count++;
        }
      }
      const nComments = r() < 0.4 ? 1 + Math.floor(r() * 2) : 0;
      for (let i = 0; i < nComments && others.length; i++) {
        const k = pick(others);
        const author = USERS.find((u) => u.key === post._author);
        const text = r() < 0.25 ? `@${author.username} ${pick(COMMENTS)}` : pick(COMMENTS);
        commentDocs.push({
          _id: new ObjectId(),
          post_id: post._id,
          user_id: idOf[k],
          content: text,
          created_at: new Date(Math.min(now, post.created_at.getTime() + (i + 1) * Math.floor(r() * 30 + 1) * 3600000)),
        });
        post.comments_count++;
      }
    }

    await posts.insertMany(postDocs.map(({ _author, ...p }) => ({ ...p, seed: true })));
    if (likeDocs.length) await likes.insertMany(likeDocs);
    if (commentDocs.length) await comments.insertMany(commentDocs);

    // ---- Summary ------------------------------------------------------------------
    const byVis = postDocs.reduce((acc, p) => ((acc[p.visibility] = (acc[p.visibility] ?? 0) + 1), acc), {});
    console.log(`\n✔ ${USERS.length} pessoas, ${PLACES.length} lugares, ${postDocs.length} visitas (${JSON.stringify(byVis)}), ${photoCount} fotos, ${likeDocs.length} curtidas, ${commentDocs.length} comentários.`);
    console.log(`\nAmigas de @${me.username} (seguem uma à outra):`);
    for (const u of USERS.filter((x) => x.friend)) console.log(`  ${u.name.padEnd(20)} @${u.username}`);
    console.log("Não são amigas:");
    for (const u of USERS.filter((x) => !x.friend)) console.log(`  ${u.name.padEnd(20)} @${u.username}${u.followsYou ? "  (segue você, mas você não segue)" : ""}`);
    console.log(`\nLogin de qualquer uma: <username>@${SEED_EMAIL_DOMAIN} · senha ${SEED_PASSWORD}`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
