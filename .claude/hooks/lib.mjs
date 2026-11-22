// Shared helpers for the project hooks (Node, cross-platform: Git Bash/Windows, macOS, Linux, CI).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/** Git Bash/MSYS paths (/c/Users/...) → native Windows paths (C:/Users/...). */
function nativePath(p) {
  if (process.platform === "win32") {
    const m = String(p).match(/^\/([a-zA-Z])\/(.*)$/);
    if (m) return `${m[1].toUpperCase()}:/${m[2]}`;
  }
  return String(p);
}

export const ROOT = path.resolve(nativePath(process.env.CLAUDE_PROJECT_DIR || process.cwd()));

/** Path of `file` relative to the project root, with forward slashes ("" if outside). */
export function relPath(file) {
  const rel = path.relative(ROOT, path.resolve(nativePath(file)));
  if (rel.startsWith("..") || path.isAbsolute(rel)) return "";
  return rel.split(path.sep).join("/");
}

export function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8");
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function pkg() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  } catch {
    return {};
  }
}

export const hasScript = (name) => Boolean(pkg().scripts?.[name]);
export const hasDep = (name) => {
  const p = pkg();
  return Boolean(p.dependencies?.[name] || p.devDependencies?.[name]);
};
export const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

/** Runs a command in the project root. Returns { ok, output } (output trimmed to the tail). */
export function run(cmd, args, timeoutMs = 300_000) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    shell: process.platform === "win32",
    env: { ...process.env, CI: "1", FORCE_COLOR: "0" },
  });
  const output = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  return { ok: r.status === 0, output: output.length > 4000 ? `…${output.slice(-4000)}` : output };
}

export function git(args) {
  const r = spawnSync("git", args, { cwd: ROOT, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

// ---- Test-file conventions -------------------------------------------------
export const TEST_FILE = /(^|\/)(tests?|e2e|k6|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/;
// .skip/.only on describe/it/test/suite/context, xit/xdescribe/xtest, fit/fdescribe, test.todo is allowed
export const FOCUS_OR_SKIP =
  /\b(describe|it|test|suite|context|bench)\s*\.\s*(skip|only|skipIf|runIf)\b|\b(xit|xdescribe|xtest|fit|fdescribe)\s*\(/;

export const PROD_FILE = /^src\/.*\.[cm]?[jt]sx?$/;

export function deny(reason) {
  process.stdout.write(
    JSON.stringify({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason } })
  );
  process.exit(0);
}
