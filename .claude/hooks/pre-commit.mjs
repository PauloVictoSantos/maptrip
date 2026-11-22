// PreToolUse (Bash, only for `git commit`): commit gate for Rule 8 / Definition of Done.
// Blocks when: (a) production code changed without test changes, (b) tests use .skip/.only,
// (c) coverage thresholds were lowered, (d) the suite (with coverage) fails,
// (e) the performance budget check fails.
import { FOCUS_OR_SKIP, PROD_FILE, TEST_FILE, deny, git, hasScript, readInput, run } from "./lib.mjs";

const input = readInput();
const cmd = String(input.tool_input?.command ?? "");
if (!/\bgit\b[^|;&]*\bcommit\b/.test(cmd)) process.exit(0);
if (/--dry-run/.test(cmd)) process.exit(0);

const all = /\s(-a|--all|-[a-zA-Z]*a[a-zA-Z]*)\b/.test(cmd);
const files = new Set(
  [git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]), all ? git(["diff", "--name-only", "--diff-filter=ACMR"]) : ""]
    .join("\n")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean)
);

const prod = [...files].filter((f) => PROD_FILE.test(f) && !TEST_FILE.test(f));
const tests = [...files].filter((f) => TEST_FILE.test(f));

// (a) Rule 8.h — no new test in the diff, no commit
if (prod.length && tests.length === 0) {
  deny(
    `Regra 8.h: este commit muda código de produção (${prod.slice(0, 5).join(", ")}${prod.length > 5 ? "…" : ""}) ` +
      `sem nenhum teste novo/alterado. Use a skill regression-guard e inclua os testes no commit.`
  );
}

// (b) Rule 8.g — no focused/skipped tests
for (const f of tests) {
  const content = git(["show", `:${f}`]) || "";
  const m = content.match(FOCUS_OR_SKIP);
  if (m) deny(`Regra 8.g: "${m[0]}" encontrado em ${f}. Remova antes de commitar.`);
}

// (c) Rule 8.g — coverage thresholds can't go down
for (const f of [...files].filter((x) => /^vitest\.config\.[cm]?[jt]s$|^vitest\.workspace/.test(x))) {
  const nums = (src) =>
    Object.fromEntries([...src.matchAll(/\b(lines|branches|functions|statements)\s*:\s*(\d+(?:\.\d+)?)/g)].map((m) => [m[1], Number(m[2])]));
  const before = nums(git(["show", `HEAD:${f}`]));
  const after = nums(git(["show", `:${f}`]));
  for (const [k, v] of Object.entries(before)) {
    if (after[k] !== undefined && after[k] < v) deny(`Regra 8.g: limite de cobertura "${k}" baixou de ${v} para ${after[k]} em ${f}.`);
  }
}

// (d) Full suite (+ coverage thresholds, enforced by the runner)
if (prod.length || tests.length) {
  const script = hasScript("test:coverage") ? "test:coverage" : hasScript("test") ? "test" : null;
  if (!script) deny("Não há script de teste no package.json; a suíte precisa existir e passar antes de commitar código.");
  const r = run("npm", ["run", script, "--silent"], 900_000);
  if (!r.ok) deny(`Regra 8.f: a suíte completa falhou (npm run ${script}). Corrija o código, não o teste:\n\n${r.output}`);
}

// (e) Performance budget
if (prod.length && hasScript("perf:budget")) {
  const r = run("npm", ["run", "perf:budget", "--silent"], 900_000);
  if (!r.ok) deny(`Orçamento de performance violado (npm run perf:budget):\n\n${r.output}`);
}

process.exit(0);
