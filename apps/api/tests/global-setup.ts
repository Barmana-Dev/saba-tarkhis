import { execSync } from "node:child_process";
import { chmodSync, rmSync, writeFileSync } from "node:fs";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public";

const STUB_PATH = "/tmp/saba-fake-clamscan.sh";
const INFECTED_MARKER = "/tmp/saba-fake-infected";

export default function globalSetup() {
  execSync("npx prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });

  // Minimal stand-in for `clamscan`: exit 0 (clean) or 1 (infected) based on a
  // marker file. It only verifies our quarantine/fail-closed wiring, not real
  // malware detection (ClamAV is not installed in this environment).
  writeFileSync(
    STUB_PATH,
    [
      "#!/bin/sh",
      'if [ -f /tmp/saba-fake-infected ]; then echo "$2: Eicar-Test-Signature FOUND" >&2; exit 1; fi',
      "exit 0",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  chmodSync(STUB_PATH, 0o755);
  rmSync(INFECTED_MARKER, { force: true });
}
