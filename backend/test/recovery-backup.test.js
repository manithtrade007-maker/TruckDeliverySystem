import assert from "node:assert/strict";
import test from "node:test";
import { buildRecoveryArchive, inspectRecoveryArchive } from "../lib/recovery-backup.js";

const data = { settings: { companyName: "Test" }, trucks: [{ truckNo: "T1" }], prices: [], statements: [], deliveries: [] };
const sqliteHeader = Buffer.concat([Buffer.from("SQLite format 3\0"), Buffer.alloc(100)]);

test("recovery archive round-trips data, database, PDFs, and checksums", async () => {
  const archive = await buildRecoveryArchive({ data, database: sqliteHeader, statementPdfs: [{ name: "one.pdf", data: Buffer.from("%PDF-test") }], createdAt: "2026-08-14T10:20:30.000Z" });
  assert.equal(archive.filename, "nm-logistic-recovery-2026-08-14T10-20-30.zip");
  const inspected = await inspectRecoveryArchive(archive.buffer);
  assert.equal(inspected.verified, true);
  assert.deepEqual(inspected.data, data);
  assert.ok(inspected.database.equals(sqliteHeader));
  assert.equal(inspected.files["statement-pdfs/one.pdf"].toString(), "%PDF-test");
});

test("recovery archive rejects incomplete ZIP files", async () => {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("data.json", "{}");
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => inspectRecoveryArchive(buffer), /missing required files/);
});

test("recovery archive rejects a file changed after checksums were created", async () => {
  const JSZip = (await import("jszip")).default;
  const archive = await buildRecoveryArchive({ data, database: sqliteHeader });
  const zip = await JSZip.loadAsync(archive.buffer);
  zip.file("data.json", JSON.stringify({ ...data, statements: [{ id: "tampered" }] }));
  const tampered = await zip.generateAsync({ type: "nodebuffer" });
  await assert.rejects(() => inspectRecoveryArchive(tampered), /Checksum failed for data.json/);
});
