// PostToolUse (Edit|Write): lint + typecheck + fast related tests for the edited file.
// Failures are fed back to Claude (decision: block) so it fixes them right away.
import { exists, hasDep, readInput, relPath, run } from "./lib.mjs";

const input = readInput();
const file = input.tool_input?.file_path ?? input.tool_response?.filePath;
if (!file) process.exit(0);

const rel = relPath(file);
if (!/^(src|tests?|e2e|scripts|k6)\/.*\.[cm]?[jt]sx?$/.test(rel)) process.exit(0);

const problems = [];

const eslintConfig = ["eslint.config.mjs", "eslint.config.js", "eslint.config.cjs", ".eslintrc.json", ".eslintrc.js"].some(exists);
if (eslintConfig) {
  const r = run("npx", ["eslint", "--max-warnings=0", rel], 120_000);
  if (!r.ok) problems.push(`ESLint (${rel}):\n${r.output}`);
}

if (/\.tsx?$/.test(rel)) {
  const r = run("npx", ["tsc", "--noEmit", "-p", "."], 180_000);
  if (!r.ok) problems.push(`Typecheck:\n${r.output}`);
}

if (hasDep("vitest")) {
  const r = run("npx", ["vitest", "related", rel, "--run", "--passWithNoTests"], 180_000);
  if (!r.ok) problems.push(`Testes relacionados a ${rel}:\n${r.output}`);
}

if (problems.length) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: `Verificação após editar ${rel} falhou. Corrija antes de seguir:\n\n${problems.join("\n\n")}`,
    })
  );
}
process.exit(0);
