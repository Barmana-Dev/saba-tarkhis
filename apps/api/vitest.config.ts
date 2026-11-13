import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup-env.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:5432/saba_tarkhis_test?schema=public",
      APP_ORIGIN: "http://localhost:3000",
      UPLOAD_DIR: "./storage-test",
      QUARANTINE_DIR: "./storage-quarantine-test",
      SESSION_TTL_DAYS: "7",
      // Rate limits stay enabled so the 429 paths are covered; auth/contact
      // keep a high test-only ceiling inside the route modules.
      REQUEST_CREATE_LIMIT_PER_HOUR: "6",
      UPLOAD_LIMIT_PER_HOUR: "10",
      MAX_DOCUMENTS_PER_REQUEST: "20",
      MAX_CASE_UPLOAD_MB: "5",
      MAX_USER_STORAGE_MB: "200",
      // Scanner contract is exercised with a stub binary; real ClamAV is not
      // available in this test environment.
      CLAMAV_ENABLED: "true",
      CLAMSCAN_PATH: "/tmp/saba-fake-clamscan.sh",
      CLAMSCAN_TIMEOUT_MS: "5000",
    },
  },
});
