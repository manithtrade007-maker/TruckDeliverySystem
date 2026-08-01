import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.readonly";
const DEFAULT_CREDENTIALS_PATH = "/etc/secrets/google-drive-service-account.json";
const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
let cachedAccessToken = null;
let cachedAccessTokenExpiresAt = 0;

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function driveError(message, status = 503) {
  return Object.assign(new Error(message), { status });
}

async function readServiceAccountCredentials() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_CREDENTIALS_PATH;
  let credentials;
  try {
    credentials = JSON.parse(await readFile(credentialsPath, "utf8"));
  } catch (_) {
    throw driveError("Google Drive is not configured. Add the service-account JSON secret file in Render.");
  }
  if (!credentials.client_email || !credentials.private_key || !credentials.token_uri) {
    throw driveError("The Google Drive service-account file is not valid.");
  }
  return credentials;
}

async function getDriveAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiresAt - 60_000) return cachedAccessToken;

  const credentials = await readServiceAccountCredentials();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: credentials.client_email,
    scope: DRIVE_SCOPE,
    aud: credentials.token_uri,
    iat: now,
    exp: now + 3600
  }));
  const unsignedJwt = `${header}.${claims}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedJwt);
  signer.end();
  const assertion = `${unsignedJwt}.${signer.sign(credentials.private_key, "base64url")}`;

  const response = await fetch(credentials.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw driveError("Google Drive authentication failed. Check the Render secret file and service account.");
  }
  cachedAccessToken = body.access_token;
  cachedAccessTokenExpiresAt = Date.now() + Number(body.expires_in || 3600) * 1000;
  return cachedAccessToken;
}

async function driveApi(pathname, searchParams = {}) {
  const token = await getDriveAccessToken();
  const url = new URL(`https://www.googleapis.com/drive/v3/${pathname}`);
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 404) throw driveError("Google Drive folder not found. Check the folder link and sharing permission.", 404);
    if (response.status === 403) throw driveError("The service account cannot view this Google Drive folder. Share the folder with it as Viewer.", 403);
    throw driveError("Google Drive could not be scanned right now. Please try again.");
  }
  return body;
}

export function extractGoogleDriveFolderId(value) {
  const raw = String(value || "").trim();
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch (_) {
    throw new Error("Enter a valid Google Drive folder link.");
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== "drive.google.com") {
    throw new Error("The folder link must come from Google Drive.");
  }
  const match = parsed.pathname.match(/\/folders\/([A-Za-z0-9_-]{10,})/);
  if (!match) throw new Error("Enter a valid Google Drive folder link, not an individual PDF link.");
  return match[1];
}

export async function listGoogleDriveFolderPdfs(folderLink) {
  const folderId = extractGoogleDriveFolderId(folderLink);
  const folder = await driveApi(`files/${encodeURIComponent(folderId)}`, {
    fields: "id,name,mimeType",
    supportsAllDrives: true
  });
  if (folder.mimeType !== FOLDER_MIME_TYPE) throw new Error("The Google Drive link is not a folder.");

  const files = [];
  let pageToken = "";
  do {
    const page = await driveApi("files", {
      q: `'${folderId}' in parents and trashed = false and mimeType = 'application/pdf'`,
      fields: "nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)",
      orderBy: "name_natural",
      pageSize: 1000,
      pageToken,
      spaces: "drive",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true
    });
    files.push(...(page.files || []));
    pageToken = page.nextPageToken || "";
  } while (pageToken);

  return {
    folder: { id: folder.id, name: folder.name },
    files: files.map((file) => ({
      id: file.id,
      name: file.name,
      size: Number(file.size || 0),
      modifiedTime: file.modifiedTime || null,
      url: `https://drive.google.com/file/d/${file.id}/view`
    }))
  };
}

export function buildDriveFolderPreview({ files, statements, month, hasUploadedPdf = () => false }) {
  if (!/^\d{4}-\d{2}$/.test(String(month || ""))) throw new Error("Select a valid statement month.");
  const monthStatements = statements.filter((statement) => statement.month === month);
  const statementsByNumber = new Map(monthStatements.map((statement) => [Number(statement.statementNumber), statement]));
  const filesByNumber = new Map();

  for (const file of files) {
    const match = String(file.name || "").trim().match(/^(\d+)\.pdf$/i);
    if (!match) continue;
    const statementNumber = Number(match[1]);
    const group = filesByNumber.get(statementNumber) || [];
    group.push(file);
    filesByNumber.set(statementNumber, group);
  }

  const rows = files.map((file) => {
    const nameMatch = String(file.name || "").trim().match(/^(\d+)\.pdf$/i);
    if (!nameMatch) return { ...file, statementNumber: null, status: "invalid_name", reason: "Filename must be only the statement number, such as 1570.pdf." };
    const statementNumber = Number(nameMatch[1]);
    if ((filesByNumber.get(statementNumber) || []).length > 1) {
      return { ...file, statementNumber, status: "duplicate", reason: `More than one PDF is named for Statement ${statementNumber}.` };
    }
    const statement = statementsByNumber.get(statementNumber);
    if (!statement) return { ...file, statementNumber, status: "not_found", reason: `Statement ${statementNumber} was not found in this month.` };
    if (statement.drivePdfUrl) return { ...file, statementId: statement.id, statementNumber, status: "already_linked", reason: "This statement already has a Google Drive link." };
    if (hasUploadedPdf(statement)) return { ...file, statementId: statement.id, statementNumber, status: "uploaded_pdf", reason: "This statement still has an old uploaded PDF. Remove it first." };
    return { ...file, statementId: statement.id, statementNumber, status: "ready", reason: "Ready to link." };
  });

  return {
    month,
    statementCount: monthStatements.length,
    fileCount: files.length,
    readyCount: rows.filter((row) => row.status === "ready").length,
    skippedCount: rows.filter((row) => row.status !== "ready").length,
    rows
  };
}
