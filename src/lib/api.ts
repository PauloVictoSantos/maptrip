import "server-only";
import { NextResponse } from "next/server";

/** Classifies a server failure so the user sees something actionable instead of an empty 500. */
export function describeServerError(err: unknown): { code: string; message: string } {
  const text = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  if (/MONGODB_URI/.test(text)) return { code: "config_mongodb", message: "Servidor sem MONGODB_URI configurada." };
  if (/AUTH_SECRET/.test(text)) return { code: "config_auth_secret", message: "Servidor sem AUTH_SECRET (mínimo 32 caracteres)." };
  if (/bad auth|Authentication failed|auth failed/i.test(text)) {
    return { code: "db_auth", message: "O banco recusou o usuário/senha da MONGODB_URI." };
  }
  if (/ServerSelection|ENOTFOUND|ETIMEDOUT|ECONNREFUSED|timed out|querySrv/i.test(text)) {
    return { code: "db_unreachable", message: "O servidor não conseguiu conectar ao MongoDB (verifique o Network Access do Atlas)." };
  }
  return { code: "internal", message: "Erro interno no servidor. Tente de novo em instantes." };
}

type Handler<R extends Request, C> = (request: R, context: C) => Promise<Response>;

/** Wraps a route handler: unexpected errors become a JSON 500 (and are logged with details). */
export function withErrors<R extends Request, C = unknown>(handler: Handler<R, C>): Handler<R, C> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      const info = describeServerError(err);
      console.error(`[maptrip] ${request.method} ${new URL(request.url).pathname} falhou (${info.code})`, err);
      return NextResponse.json({ error: info.message, code: info.code }, { status: 500 });
    }
  };
}
