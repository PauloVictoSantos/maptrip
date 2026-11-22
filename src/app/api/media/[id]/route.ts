import { NextRequest, NextResponse } from "next/server";
import { getCollections, toObjectId } from "@/lib/db/mongo";

// GET /api/media/[id] — serves an uploaded photo from GridFS
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = toObjectId((await params).id);
  if (!id) return new NextResponse("Not found", { status: 404 });

  const { media } = await getCollections();
  const file = await media.find({ _id: id }).next();
  if (!file) return new NextResponse("Not found", { status: 404 });

  const chunks: Buffer[] = [];
  for await (const chunk of media.openDownloadStream(id)) chunks.push(chunk as Buffer);
  const body = Buffer.concat(chunks);

  return new NextResponse(body, {
    headers: {
      "Content-Type": (file.metadata?.contentType as string) || "application/octet-stream",
      "Content-Length": String(body.length),
      // Ids never change content, so the browser/CDN can keep them forever.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
