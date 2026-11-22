// Stop: runs the full test suite when code changed in this turn's working tree.
// If it fails, blocks the turn from ending (Claude must fix it). Never loops:
// when the stop was already blocked once (stop_hook_active), it lets Claude stop
// and surfaces the failure to the user instead.
import { git, hasScript, readInput, run } from "./lib.mjs";

const input = readInput();

const changed = git(["status", "--porcelain"])
  .split("\n")
  .map((l) => l.slice(3).trim())
  .filter((f) => /^(src|tests?|e2e|scripts|k6)\//.test(f));
if (changed.length === 0) process.exit(0);

if (!hasScript("test")) {
  process.stdout.write(
    JSON.stringify({ systemMessage: "Aviso: ainda não há script \"test\" no package.json — a suíte não pôde rodar (Fase 0 pendente)." })
  );
  process.exit(0);
}

const r = run("npm", ["test", "--silent"], 600_000);
if (r.ok) process.exit(0);

if (input.stop_hook_active) {
  process.stdout.write(JSON.stringify({ systemMessage: `A suíte de testes continua falhando:\n${r.output}` }));
  process.exit(0);
}
process.stdout.write(
  JSON.stringify({ decision: "block", reason: `A suíte completa falhou. Corrija o código (nunca o teste) antes de encerrar:\n\n${r.output}` })
);
process.exit(0);
