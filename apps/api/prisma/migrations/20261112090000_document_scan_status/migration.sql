-- Additive, non-destructive migration: document scan metadata.
-- Existing rows stay PENDING so they are not downloadable until re-scanned.

CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'CLEAN', 'INFECTED', 'ERROR', 'SKIPPED');

ALTER TABLE "RequestDocument" ADD COLUMN "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "RequestDocument" ADD COLUMN "scanEngine" TEXT;
ALTER TABLE "RequestDocument" ADD COLUMN "scannedAt" TIMESTAMP(3);
