import { STUB_PATH } from "./fake-clamav";

process.env.NODE_ENV = "test";
process.env.APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? "./storage-test";
// Rate limits stay enabled in tests so 429 behaviour is exercised for real.
process.env.DISABLE_RATE_LIMIT = "false";
process.env.COOKIE_SECURE = "false";
// The scanner stub is generated per OS by tests/global-setup.ts; point the app
// at the actual path instead of a hard-coded POSIX /tmp location.
process.env.CLAMSCAN_PATH = STUB_PATH;
