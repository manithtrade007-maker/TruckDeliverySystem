// Authentication: credentials, sessions, password hashing, rate limiting.
import { randomBytes, timingSafeEqual, scrypt } from "node:crypto";

export const appUsername = process.env.APP_USERNAME || "";
export const appPassword = process.env.APP_PASSWORD || "";

const sessions = new Map();                 // token -> { role, expiresAt }
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const loginAttempts = new Map();            // ip -> { count, resetAt }
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;    // 15 minutes

function isAuthEnabled() {
  return Boolean(appUsername && appPassword);
}

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""), "utf8");
  const bufB = Buffer.from(String(b || ""), "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16).toString("hex");
    scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(`${salt}:${key.toString("hex")}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve) => {
    const [salt, key] = (stored || "").split(":");
    if (!salt || !key) return resolve(false);
    scrypt(String(password), salt, 64, (err, derivedKey) => {
      if (err) return resolve(false);
      try { resolve(timingSafeEqual(Buffer.from(key, "hex"), derivedKey)); }
      catch { resolve(false); }
    });
  });
}

function createSession(role) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { role, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

function getSessionRole(token) {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) { sessions.delete(token); return null; }
  return session.role;
}

function getAuthorizedRole(req) {
  if (!isAuthEnabled()) return "admin";
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return getSessionRole(header.slice(7));
}

function getClientIp(req) {
  return (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return false;
  if (now > entry.resetAt) { loginAttempts.delete(ip); return false; }
  return entry.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_LOCKOUT_MS });
  } else {
    entry.count += 1;
  }
}

function isAuthorized(req) {
  return getAuthorizedRole(req) !== null;
}

function requestAuth(res) {
  res.writeHead(401, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Login required." }));
}

function clearLoginAttempts(ip) {
  loginAttempts.delete(ip);
}

function deleteSession(token) {
  sessions.delete(token);
}

export { isAuthEnabled, safeEqual, hashPassword, verifyPassword, createSession, getSessionRole, getAuthorizedRole, getClientIp, isRateLimited, recordFailedLogin, isAuthorized, requestAuth, clearLoginAttempts, deleteSession };
