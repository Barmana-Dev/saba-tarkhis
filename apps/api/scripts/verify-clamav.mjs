/**
 * Verifies that the production scanner actually works, using the EICAR test
 * string (a harmless file every antivirus must flag).
 *
 *   npm run scan:verify                 # uses CLAMSCAN_PATH / clamscan on PATH
 *   CLAMSCAN_PATH=/usr/bin/clamscan npm run scan:verify
 *
 * Run it inside the deployed container after the first boot:
 *   docker compose -f docker-compose.prod.yml exec app npm run scan:verify
 */
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { scanFile } from "../dist/lib/scan.js";

const EICAR = String.raw`X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`;

const dir = await mkdtemp(path.join(os.tmpdir(), "saba-eicar-"));
const sample = path.join(dir, "eicar.com");

try {
  await writeFile(sample, `${EICAR}\n`, "utf8");
  const result = await scanFile(sample);
  if (result.status !== "INFECTED") {
    console.error(
      `[FAIL] The scanner (${result.engine}) reported "${result.status}" for the EICAR test file. ` +
        "Signatures are probably missing or stale: run `freshclam` and try again.",
    );
    process.exitCode = 1;
  } else {
    console.log(`[OK] ${result.engine} detected the EICAR test file: ${result.signature || "signature"}`);
  }
} finally {
  await rm(dir, { recursive: true, force: true });
}
