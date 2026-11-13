-- Documents stored before the scan-status column existed kept the column's
-- PENDING default, so the download endpoint refused them and the browser got a
-- 404. Every stored file only reaches storage after the upload pipeline scans and
-- accepts it (see saveRequestFile), so rows without scan metadata are backfilled
-- as CLEAN. Rows that already carry scan metadata are left untouched.

UPDATE "RequestDocument"
SET "scanStatus" = 'CLEAN',
    "scanEngine" = COALESCE("scanEngine", 'legacy-backfill'),
    "scannedAt" = COALESCE("scannedAt", "createdAt")
WHERE "scanEngine" IS NULL;
