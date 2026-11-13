import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { buildSamplePdf } from "../prisma/sample-pdf";
import { prisma } from "../src/lib/prisma";
import { scanFile, ScannerUnavailableError } from "../src/lib/scan";
import { createUser, loginAgent, resetDb, validPayload } from "./helpers";

const STUB = "/tmp/saba-fake-clamscan.sh";
const MARKER = "/tmp/saba-fake-infected";
const pdf = buildSamplePdf("scan sample");

async function submit(
  agent: Awaited<ReturnType<typeof loginAgent>>["agent"],
  csrf: string,
) {
  return agent
    .post("/api/v1/requests")
    .set("x-csrf-token", csrf)
    .field("payload", JSON.stringify(validPayload))
    .attach("files", pdf, "scan.pdf");
}

describe("document malware scanning", () => {
  beforeEach(async () => {
    await resetDb();
    rmSync(MARKER, { force: true });
  });

  afterEach(() => {
    rmSync(MARKER, { force: true });
    if (existsSync(`${STUB}.off`)) renameSync(`${STUB}.off`, STUB);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("marks clean uploads and serves them after the scan", async () => {
    await createUser("CUSTOMER", "09127770001", "مشتری اسکن");
    const customer = await loginAgent("09127770001");

    const created = await submit(customer.agent, customer.csrf);
    expect(created.status).toBe(201);
    const documentId = created.body.data.documents[0].id as string;

    const stored = await prisma.requestDocument.findUniqueOrThrow({ where: { id: documentId } });
    expect(stored.scanStatus).toBe("CLEAN");
    expect(stored.scanEngine).toBe("saba-fake-clamscan.sh");
    expect(stored.scannedAt).not.toBeNull();

    const download = await customer.agent.get(
      `/api/v1/requests/${created.body.data.id}/documents/${documentId}/download`,
    );
    expect(download.status).toBe(200);
  });

  it("rejects infected files and persists neither request nor document", async () => {
    await createUser("CUSTOMER", "09127770002", "مشتری آلوده");
    const customer = await loginAgent("09127770002");
    writeFileSync(MARKER, "infected");

    const response = await submit(customer.agent, customer.csrf);
    expect(response.status).toBe(400);
    expect(response.body.message).toContain("تهدید");
    expect(await prisma.clearanceRequest.count()).toBe(0);
    expect(await prisma.requestDocument.count()).toBe(0);
  });

  it("fails closed when the scanner is unavailable", async () => {
    await createUser("CUSTOMER", "09127770003", "مشتری اسکنر قطع");
    const customer = await loginAgent("09127770003");
    renameSync(STUB, `${STUB}.off`);

    const response = await submit(customer.agent, customer.csrf);
    expect(response.status).toBe(503);
    expect(response.body.code).toBe("SCAN_UNAVAILABLE");
    expect(await prisma.clearanceRequest.count()).toBe(0);
    expect(await prisma.requestDocument.count()).toBe(0);
  });

  it("hides documents that are not CLEAN from downloads", async () => {
    await createUser("CUSTOMER", "09127770004", "مشتری قرنطینه");
    const customer = await loginAgent("09127770004");
    const created = await submit(customer.agent, customer.csrf);
    const requestId = created.body.data.id as string;
    const documentId = created.body.data.documents[0].id as string;

    await prisma.requestDocument.update({
      where: { id: documentId },
      data: { scanStatus: "PENDING" },
    });

    const download = await customer.agent.get(
      `/api/v1/requests/${requestId}/documents/${documentId}/download`,
    );
    expect(download.status).toBe(404);
  });

  it("maps scanner exit codes and unreachable binaries", async () => {
    const sample = "/tmp/scan-contract.pdf";
    writeFileSync(sample, pdf);

    await expect(scanFile(sample, { binary: STUB })).resolves.toMatchObject({ status: "CLEAN" });

    writeFileSync(MARKER, "infected");
    await expect(scanFile(sample, { binary: STUB })).resolves.toMatchObject({
      status: "INFECTED",
    });

    await expect(
      scanFile(sample, { binary: "/nonexistent/clamscan-binary" }),
    ).rejects.toBeInstanceOf(ScannerUnavailableError);
  });
});
