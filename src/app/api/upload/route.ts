import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getCollections } from "@/lib/db/mongo";
import { getViewerId } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";

const MAX_SIZE = 5 * 1024 * 1024;

/** Detects the real image type from the first bytes (the browser-sent type can't be trusted). */
function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 6 && (buf.subarray(0, 6).toString("ascii") === "GIF87a" || buf.subarray(0, 6).toString("ascii") === "GIF89a")) return "image/gif";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

// POST /api/upload (multipart, field "file") → { url: "/api/media/<id>" }
export async function POST(request: NextRequest) {
  const viewer = await getViewerId();
  if (!viewer) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  if (!rateLimit(`upload:${viewer.toHexString()}`, 60, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "Limite de envios atingido. Tente mais tarde." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo 5MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImage(buffer);
  if (!contentType) {
    return NextResponse.json({ error: "Formato inválido. Use JPG, PNG, WebP ou GIF." }, { status: 400 });
  }

  const { media } = await getCollections();
  const upload = media.openUploadStream(`${viewer.toHexString()}-${Date.now()}`, {
    metadata: { owner: viewer, contentType },
  });
  await new Promise<void>((resolve, reject) => {
    Readable.from(buffer).pipe(upload).on("finish", () => resolve()).on("error", reject);
  });

  return NextResponse.json({ url: `/api/media/${upload.id.toString()}` }, { status: 201 });
}
