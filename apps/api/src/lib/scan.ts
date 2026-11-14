import { execFile } from "node:child_process";
import path from "node:path";
import { env } from "../config/env";

export type ScanOutcome =
  | { status: "CLEAN"; engine: string }
  | { status: "INFECTED"; engine: string; signature: string };

/**
 * Raised when the scanner cannot be executed, times out or fails unexpectedly.
 * Callers must treat this as "not scanned" and fail closed.
 */
export class ScannerUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScannerUnavailableError";
  }
}

type ScanOptions = {
  binary?: string;
  timeoutMs?: number;
};

/**
 * `.mjs`/`.cjs`/`.js` scanners are executed with the current Node binary, which
 * keeps the test stub cross-platform (Windows cannot exec a shell script).
 */
function commandFor(binary: string, filePath: string): { command: string; args: string[] } {
  const args = ["--no-summary", "--infected", "--", filePath];
  if (/\.(mjs|cjs|js)$/i.test(binary)) {
    return { command: process.execPath, args: [binary, ...args] };
  }
  return { command: binary, args };
}

/**
 * Runs ClamAV (`clamscan`) against a quarantined file.
 * Exit codes: 0 = clean, 1 = infected, anything else = scanner failure.
 */
export function scanFile(filePath: string, options: ScanOptions = {}): Promise<ScanOutcome> {
  const binary = options.binary ?? env.clamscanPath;
  const timeout = options.timeoutMs ?? env.clamscanTimeoutMs;
  const engine = path.basename(binary);
  const { command, args } = commandFor(binary, filePath);

  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { timeout, maxBuffer: 1024 * 1024 },
      (error, stdout) => {
        if (!error) {
          resolve({ status: "CLEAN", engine });
          return;
        }

        const exitCode = typeof error.code === "number" ? error.code : null;
        if (exitCode === 1) {
          resolve({
            status: "INFECTED",
            engine,
            signature: String(stdout ?? "").trim().slice(0, 500),
          });
          return;
        }

        reject(
          new ScannerUnavailableError(
            `scanner exited with ${exitCode ?? error.code ?? "unknown"}: ${error.message}`,
          ),
        );
      },
    );
  });
}
