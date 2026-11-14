import os from "node:os";
import path from "node:path";

/**
 * Cross-platform stand-in for the `clamscan` binary used by the test suite.
 * It is a Node script (executed through `process.execPath`) so the tests also
 * run on Windows, where a `#!/bin/sh` stub cannot be executed.
 *
 * Behaviour: exit 0 (clean), or exit 1 (infected) when the marker file exists.
 */
export const STUB_PATH = path.join(os.tmpdir(), "saba-fake-clamscan.mjs");
export const INFECTED_MARKER = path.join(os.tmpdir(), "saba-fake-infected");
/** Makes the stub exit with a scanner-failure code (not "clean"/"infected"). */
export const FAILURE_MARKER = path.join(os.tmpdir(), "saba-fake-scanner-down");
export const STUB_ENGINE_NAME = path.basename(STUB_PATH);

export function fakeClamavSource(): string {
  return `import { existsSync } from "node:fs";

const infected = ${JSON.stringify(INFECTED_MARKER)};
const down = ${JSON.stringify(FAILURE_MARKER)};
const file = process.argv[process.argv.length - 1] ?? "unknown";

if (existsSync(down)) {
  console.error("clamscan: failed to load virus database");
  process.exit(3);
}

if (existsSync(infected)) {
  console.error(\`\${file}: Eicar-Test-Signature FOUND\`);
  process.exit(1);
}

process.exit(0);
`;
}
