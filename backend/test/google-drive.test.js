import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDriveFolderPreview, extractGoogleDriveFolderId } from "../lib/google-drive.js";

test("extractGoogleDriveFolderId accepts a shared Drive folder URL", () => {
  assert.equal(
    extractGoogleDriveFolderId("https://drive.google.com/drive/folders/1Zsp2Q716PDPsQzdnUhd-5fNpaz586W27?usp=sharing"),
    "1Zsp2Q716PDPsQzdnUhd-5fNpaz586W27"
  );
});

test("extractGoogleDriveFolderId rejects an individual Drive file URL", () => {
  assert.throws(
    () => extractGoogleDriveFolderId("https://drive.google.com/file/d/1234567890abcdef/view"),
    /folder link/i
  );
});

test("Drive folder preview links only exact, safe statement matches", () => {
  const statements = [
    { id: "s-1570", month: "2026-07", statementNumber: 1570 },
    { id: "s-1571", month: "2026-07", statementNumber: 1571, drivePdfUrl: "https://drive.google.com/file/d/existing-file/view" },
    { id: "s-1572", month: "2026-07", statementNumber: 1572 },
    { id: "s-other-month", month: "2026-08", statementNumber: 1573 }
  ];
  const files = [
    { id: "f-1570", name: "1570.pdf", url: "https://drive.google.com/file/d/f-1570/view" },
    { id: "f-1571", name: "1571.PDF", url: "https://drive.google.com/file/d/f-1571/view" },
    { id: "f-1572", name: "1572.pdf", url: "https://drive.google.com/file/d/f-1572/view" },
    { id: "f-1573", name: "1573.pdf", url: "https://drive.google.com/file/d/f-1573/view" },
    { id: "f-bad", name: "statement 1574.pdf", url: "https://drive.google.com/file/d/f-bad/view" }
  ];

  const preview = buildDriveFolderPreview({
    files,
    statements,
    month: "2026-07",
    hasUploadedPdf: (statement) => statement.id === "s-1572"
  });

  assert.equal(preview.readyCount, 1);
  assert.equal(preview.skippedCount, 4);
  assert.deepEqual(preview.rows.map((row) => row.status), [
    "ready",
    "already_linked",
    "uploaded_pdf",
    "not_found",
    "invalid_name"
  ]);
  assert.equal(preview.rows[0].statementId, "s-1570");
});

test("Drive folder preview skips duplicate statement filenames", () => {
  const preview = buildDriveFolderPreview({
    files: [
      { id: "one", name: "1570.pdf" },
      { id: "two", name: "01570.pdf" }
    ],
    statements: [{ id: "s-1570", month: "2026-07", statementNumber: 1570 }],
    month: "2026-07"
  });

  assert.equal(preview.readyCount, 0);
  assert.deepEqual(preview.rows.map((row) => row.status), ["duplicate", "duplicate"]);
});
