-- The earlier backfill (20261113120000) promoted every row without scan metadata
-- to CLEAN without reading the file, and the download endpoint trusts CLEAN. That
-- turned "scan result unknown" into "approved". Undo that promotion: documents
-- carrying the backfill marker go back to PENDING so they must be scanned again
-- before they can be downloaded.
--
-- Rows that were genuinely scanned keep their engine and timestamps.

UPDATE "RequestDocument"
SET "scanStatus" = 'PENDING',
    "scanEngine" = NULL,
    "scannedAt" = NULL
WHERE "scanEngine" = 'legacy-backfill';
