// PreToolUse (Edit|Write): blocks focused/skipped tests (.only, .skip, xit, xdescribe, fit…)
// from being written into test files. Rule 8.g of CLAUDE.md.
import { FOCUS_OR_SKIP, TEST_FILE, deny, readInput, relPath } from "./lib.mjs";

const input = readInput();
const file = input.tool_input?.file_path;
if (!file) process.exit(0);

const rel = relPath(file);
if (!TEST_FILE.test(rel)) process.exit(0);

const text = input.tool_input?.content ?? input.tool_input?.new_string ?? "";
const m = text.match(FOCUS_OR_SKIP);
if (m) {
  deny(
    `Regra 8.g: "${m[0]}" não é permitido em testes (${rel}). Não pule nem foque testes; ` +
      `corrija o código ou, se o requisito mudou, ajuste o teste e explique no commit.`
  );
}
process.exit(0);
