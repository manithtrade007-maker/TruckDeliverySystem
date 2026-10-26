import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../server.js", import.meta.url), "utf8");
const backupCode = source.slice(source.indexOf("function runRecoveryBackup("), source.indexOf("async function retryRecoveryDelivery("));

function harness({ archive, deliver = async () => {} }) {
  const data = { recoveryBackups: [] };
  let id = 0;
  const context = vm.createContext({
    crypto: { randomUUID: () => String(++id) }, console,
    readData: async () => data,
    recoveryFingerprint: () => "same-data",
    updateData: async (mutator) => mutator(data),
    createRecoveryArchive: archive,
    getTelegramConfig: () => true,
    retryRecoveryDelivery: deliver,
    addActivity: () => {}, retryDelayMs: () => 1000,
  });
  vm.runInContext(`let recoveryBackupRunning = false;
    let recoveryBackupQueue = Promise.resolve();
    const verifiedRecoveryStatuses = new Set(["sent", "local_only", "delivery_failed"]);
    ${backupCode}`, context);
  return { run: (options) => context.runRecoveryBackup(options), data };
}
const archive = { filename: "backup.zip", buffer: Buffer.from("verified") };

test("verified local backup completes while Telegram upload is still pending", async () => {
  let finishUpload;
  let uploading = false;
  const h = harness({ archive: async () => archive, deliver: () => {
    uploading = true;
    return new Promise((resolve) => { finishUpload = resolve; });
  } });
  const result = await h.run({ reason: "before-delete" });
  assert.equal(uploading, true);
  assert.equal(result.status, "local_only");
  assert.ok(h.data.recoveryBackups[0].nextAttemptAt);
  assert.equal((await h.run({ reason: "before-delete" })).reason, "unchanged");
  finishUpload();
});

test("overlapping safety backups wait for verification instead of rejecting deletion", async () => {
  let release;
  const h = harness({ archive: () => new Promise((resolve) => { release = resolve; }) });
  const first = h.run();
  const second = h.run({ reason: "before-delete" });
  let secondFinished = false;
  second.then(() => { secondFinished = true; });
  await new Promise(setImmediate);
  assert.equal(secondFinished, false);
  release(archive);
  assert.equal((await first).created, true);
  assert.equal((await second).reason, "unchanged");
});

test("failed archive does not poison the queue or report a successful safety backup", async () => {
  let attempts = 0;
  const h = harness({ archive: async () => {
    if (++attempts === 1) throw new Error("disk full");
    return archive;
  } });
  await assert.rejects(h.run(), /disk full/);
  assert.equal((await h.run()).created, true);
});
