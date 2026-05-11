import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { db } from "./db.mjs";
import { PROFESSIONAL_PROFESSIONS } from "../src/professional-config.js";

const PORT = Number(process.env.ODC_API_PORT || 8787);
const SESSION_COOKIE = "odc_prof_session";
const ADMIN_SESSION_COOKIE = "odc_admin_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const EMAIL_VERIFICATION_DURATION_MS = 1000 * 60 * 60 * 24;
const AUTH_WINDOW_MS = 1000 * 60 * 15;
const AUTH_MAX_ATTEMPTS = 8;
const CONTACT_MESSAGE_STATUSES = new Set(["unread", "read", "archived"]);
const PRODUCT_AVAILABILITY_STATUSES = new Set(["available", "unavailable"]);
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || "").trim();
const CONTACT_NOTIFICATION_TO = String(process.env.CONTACT_NOTIFICATION_TO || "contact@odyssee.ma").trim();
const MAIL_FROM = String(process.env.MAIL_FROM || "noreply@odyssee.ma").trim();
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || "").trim().replace(/\/+$/, "");
const FRONTEND_REDIRECT_ORIGIN = (
  FRONTEND_ORIGIN ||
  String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "") ||
  (process.env.NODE_ENV === "production" ? "" : "http://localhost:5173")
);
const API_ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  ...String(process.env.API_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean)
];
const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
);
const DEFAULT_ADMIN_USERNAME = String(process.env.ODC_ADMIN_USERNAME || "Admin").trim();
const DEFAULT_ADMIN_PASSWORD = String(process.env.ODC_ADMIN_PASSWORD || "OdysseeAdmin2026");

const app = express();
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (origin && API_ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  next();
});

app.use(express.json());
app.use(cookieParser());

const authAttemptStore = new Map();

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    profession: row.profession,
    status: row.status,
    role: row.role,
    emailVerifiedAt: row.email_verified_at || null,
    createdAt: row.created_at
  };
}

function sanitizeAdminUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    status: row.status,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || null
  };
}

function setSessionCookie(res, token) {
  const isSecure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = FRONTEND_ORIGIN ? "none" : "lax";
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite,
    secure: isSecure,
    path: "/",
    maxAge: SESSION_DURATION_MS
  });
}

function clearSessionCookie(res) {
  const isSecure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = FRONTEND_ORIGIN ? "none" : "lax";
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite,
    secure: isSecure,
    path: "/"
  });
}

function setAdminSessionCookie(res, token) {
  const isSecure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = FRONTEND_ORIGIN ? "none" : "lax";
  res.cookie(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite,
    secure: isSecure,
    path: "/",
    maxAge: SESSION_DURATION_MS
  });
}

function clearAdminSessionCookie(res) {
  const isSecure = process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);
  const sameSite = FRONTEND_ORIGIN ? "none" : "lax";
  res.clearCookie(ADMIN_SESSION_COOKIE, {
    httpOnly: true,
    sameSite,
    secure: isSecure,
    path: "/"
  });
}

function nowIso() {
  return new Date().toISOString();
}

function addMillisecondsIso(milliseconds) {
  return new Date(Date.now() + milliseconds).toISOString();
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function listProductStatusOverrides() {
  const productRows = db
    .prepare(`SELECT product_id, status, updated_at FROM product_status_overrides ORDER BY product_id ASC`)
    .all();
  const colorwayRows = db
    .prepare(`
      SELECT product_id, colorway_id, status, updated_at
      FROM product_colorway_status_overrides
      ORDER BY product_id ASC, colorway_id ASC
    `)
    .all();

  return {
    products: productRows.map((row) => ({
      productId: row.product_id,
      status: PRODUCT_AVAILABILITY_STATUSES.has(row.status) ? row.status : "available",
      updatedAt: row.updated_at
    })),
    colorways: colorwayRows.map((row) => ({
      productId: row.product_id,
      colorwayId: row.colorway_id,
      status: PRODUCT_AVAILABILITY_STATUSES.has(row.status) ? row.status : "available",
      updatedAt: row.updated_at
    }))
  };
}

function normalizeProductId(value) {
  return String(value || "").trim();
}

function normalizeSourceUrl(value) {
  try {
    const parsedUrl = new URL(String(value || "").trim());
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return "";
    }
    return parsedUrl.toString();
  } catch {
    return "";
  }
}

function expiryIso() {
  return new Date(Date.now() + SESSION_DURATION_MS).toISOString();
}

function listFavoriteProductIds(userId) {
  return db
    .prepare(`SELECT product_id FROM professional_favorites WHERE user_id = ? ORDER BY id DESC`)
    .all(userId)
    .map((row) => row.product_id);
}

function listContactMessages() {
  const rows = db.prepare(`
    SELECT
      id,
      name,
      email,
      phone,
      subject,
      sector,
      message,
      source,
      status,
      created_at
    FROM contact_messages
    ORDER BY
      CASE status
        WHEN 'unread' THEN 0
        WHEN 'read' THEN 1
        ELSE 2
      END ASC,
      created_at DESC,
      id DESC
  `).all();

  const unreadCount = rows.filter((row) => row.status === "unread").length;

  return {
    unreadCount,
    messages: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || "",
      subject: row.subject,
      sector: row.sector || "",
      message: row.message,
      source: row.source || "contact-page",
      status: row.status || "unread",
      createdAt: row.created_at
    }))
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendContactNotificationEmail(contactMessage) {
  if (!BREVO_API_KEY || !MAIL_FROM || !CONTACT_NOTIFICATION_TO) {
    return { skipped: true };
  }

  const subjectLabelMap = {
    showroom: "Visite showroom",
    residential: "Projet résidentiel",
    contract: "Projet contract",
    professional: "Projet professionnel"
  };

  const subjectLabel = subjectLabelMap[contactMessage.subject] || contactMessage.subject || "Nouveau message";
  const escapedMessage = escapeHtml(contactMessage.message).replace(/\n/g, "<br />");
  const htmlContent = `
    <div style="margin:0;padding:32px 0;background:#f3ede4;font-family:Arial,'Helvetica Neue',sans-serif;color:#181411;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;border-collapse:collapse;background:#fffdf8;border:1px solid #e5d8ca;">
              <tr>
                <td style="padding:28px 32px 20px;background:#181411;color:#fff8ef;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:0.14em;line-height:1;">ODYSSEE</div>
                  <div style="margin-top:14px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,248,239,0.68);">Nouveau message entrant</div>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 32px 14px;">
                  <h1 style="margin:0 0 8px;font-size:28px;line-height:1.05;font-weight:500;">${escapeHtml(subjectLabel)}</h1>
                  <p style="margin:0;color:#6f665f;font-size:15px;line-height:1.6;">Un nouveau message a été envoyé depuis le formulaire de contact Odyssée.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 20px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fbf7f1;border:1px solid #e9dfd4;">
                    <tr>
                      <td style="padding:16px 18px;border-bottom:1px solid #e9dfd4;width:50%;">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Nom</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(contactMessage.name)}</div>
                      </td>
                      <td style="padding:16px 18px;border-bottom:1px solid #e9dfd4;">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Email</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(contactMessage.email)}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 18px;border-bottom:1px solid #e9dfd4;">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Téléphone</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(contactMessage.phone || "Non renseigné")}</div>
                      </td>
                      <td style="padding:16px 18px;border-bottom:1px solid #e9dfd4;">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Source</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(contactMessage.source || "contact-page")}</div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:16px 18px;border-bottom:${contactMessage.sector ? "1px solid #e9dfd4" : "0"};">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Sujet</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(subjectLabel)}</div>
                      </td>
                      <td style="padding:16px 18px;border-bottom:${contactMessage.sector ? "1px solid #e9dfd4" : "0"};">
                        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;">Secteur</div>
                        <div style="margin-top:6px;font-size:16px;color:#181411;">${escapeHtml(contactMessage.sector || "—")}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px 32px;">
                  <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8a7f75;margin-bottom:10px;">Message</div>
                  <div style="padding:18px 20px;background:#f6f0e8;border:1px solid #e5d8ca;font-size:16px;line-height:1.7;color:#181411;">${escapedMessage}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        email: MAIL_FROM,
        name: "Odyssée"
      },
      to: [
        {
          email: CONTACT_NOTIFICATION_TO
        }
      ],
      replyTo: {
        email: contactMessage.email,
        name: contactMessage.name
      },
      subject: `[Odyssée] ${subjectLabel}`,
      htmlContent
    })
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(payload || "Brevo a refusé l’envoi.");
  }

  return { success: true };
}

function getRequestOrigin(req) {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!host) {
    return "";
  }

  return `${String(protocol).split(",")[0]}://${String(host).split(",")[0]}`.replace(/\/+$/, "");
}

function getFrontendRedirectUrl(path = "/") {
  const base = FRONTEND_REDIRECT_ORIGIN || "";
  if (!base) {
    return path;
  }

  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function createEmailVerificationToken(userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = addMillisecondsIso(EMAIL_VERIFICATION_DURATION_MS);

  db.prepare(`
    UPDATE professional_email_verifications
    SET used_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND used_at IS NULL
  `).run(userId);

  db.prepare(`
    INSERT INTO professional_email_verifications (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, tokenHash, expiresAt);

  return { token, expiresAt };
}

async function sendEmailVerificationEmail({ req, user, token }) {
  if (!BREVO_API_KEY || !MAIL_FROM) {
    return { skipped: true };
  }

  const apiOrigin = getRequestOrigin(req);
  const verificationUrl = `${apiOrigin}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const displayName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "bonjour";
  const htmlContent = `
    <div style="margin:0;padding:32px 0;background:#f3ede4;font-family:Arial,'Helvetica Neue',sans-serif;color:#181411;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr>
          <td align="center">
            <table role="presentation" width="640" cellspacing="0" cellpadding="0" style="width:640px;max-width:640px;border-collapse:collapse;background:#fffdf8;border:1px solid #e5d8ca;">
              <tr>
                <td style="padding:28px 32px 20px;background:#181411;color:#fff8ef;">
                  <div style="font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:0.14em;line-height:1;">ODYSSEE</div>
                  <div style="margin-top:14px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,248,239,0.68);">Confirmation de compte</div>
                </td>
              </tr>
              <tr>
                <td style="padding:30px 32px 10px;">
                  <h1 style="margin:0 0 12px;font-size:28px;line-height:1.12;font-weight:500;">Confirmez votre adresse email</h1>
                  <p style="margin:0;color:#6f665f;font-size:15px;line-height:1.65;">Bonjour ${escapeHtml(displayName)}, confirmez votre adresse email pour activer votre compte Odyssée et enregistrer vos produits favoris.</p>
                </td>
              </tr>
              <tr>
                <td style="padding:18px 32px 28px;">
                  <a href="${escapeHtml(verificationUrl)}" style="display:inline-block;background:#181411;color:#fff8ef;text-decoration:none;padding:14px 22px;font-size:15px;">Confirmer mon email</a>
                  <p style="margin:18px 0 0;color:#8a7f75;font-size:13px;line-height:1.55;">Ce lien est valable pendant 24 heures. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        email: MAIL_FROM,
        name: "Odyssée"
      },
      to: [
        {
          email: user.email,
          name: displayName
        }
      ],
      subject: "Confirmez votre compte Odyssée",
      htmlContent
    })
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(payload || "Brevo a refusé l’envoi.");
  }

  return { success: true };
}

function buildSessionPayload(user) {
  const favoriteProductIds = listFavoriteProductIds(user.id);

  return {
    authenticated: true,
    user,
    favoriteProductIds
  };
}

function purgeExpiredSessions() {
  db.prepare(`DELETE FROM professional_sessions WHERE expires_at IS NOT NULL AND expires_at <= ?`).run(nowIso());
  db.prepare(`DELETE FROM admin_sessions WHERE expires_at IS NOT NULL AND expires_at <= ?`).run(nowIso());
}

function getSession(req) {
  purgeExpiredSessions();
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.id as session_id, s.token, u.*
       FROM professional_sessions s
       JOIN professional_users u ON u.id = s.user_id
       WHERE s.token = ?
         AND (s.expires_at IS NULL OR s.expires_at > ?)`
    )
    .get(token, nowIso());

  if (!row) return null;

  db
    .prepare(`UPDATE professional_sessions SET last_seen_at = CURRENT_TIMESTAMP, expires_at = ? WHERE id = ?`)
    .run(expiryIso(), row.session_id);
  return {
    token,
    user: sanitizeUser(row)
  };
}

function requireSession(req, res, next) {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Session requise." });
    return;
  }

  if (session.user.status && session.user.status !== "active") {
    db.prepare(`DELETE FROM professional_sessions WHERE token = ?`).run(session.token);
    clearSessionCookie(res);
    res.status(403).json({ error: "Ce compte n’est pas actif." });
    return;
  }

  req.professionalSession = session;
  next();
}

function requireAdmin(req, res, next) {
  const session = getAdminSession(req);
  if (!session) {
    res.status(401).json({ error: "Session administrateur requise." });
    return;
  }

  if (session.user.status && session.user.status !== "active") {
    db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(session.token);
    clearAdminSessionCookie(res);
    res.status(403).json({ error: "Ce compte n’est pas actif." });
    return;
  }

  req.adminSession = session;
  next();
}

function getAdminSession(req) {
  purgeExpiredSessions();
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT s.id as session_id, s.token, u.*
       FROM admin_sessions s
       JOIN admin_users u ON u.id = s.user_id
       WHERE s.token = ?
         AND (s.expires_at IS NULL OR s.expires_at > ?)`
    )
    .get(token, nowIso());

  if (!row) return null;

  db
    .prepare(`UPDATE admin_sessions SET last_seen_at = CURRENT_TIMESTAMP, expires_at = ? WHERE id = ?`)
    .run(expiryIso(), row.session_id);

  return {
    token,
    user: sanitizeAdminUser(row)
  };
}

function getAdminUserByUsername(username) {
  return db.prepare(`SELECT * FROM admin_users WHERE lower(username) = lower(?)`).get(String(username || "").trim());
}

async function ensureDefaultAdminUser() {
  if (!DEFAULT_ADMIN_USERNAME || !DEFAULT_ADMIN_PASSWORD) {
    return;
  }

  const existing = getAdminUserByUsername(DEFAULT_ADMIN_USERNAME);
  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
  db.prepare(`
    INSERT INTO admin_users (username, password_hash, status)
    VALUES (?, ?, 'active')
  `).run(DEFAULT_ADMIN_USERNAME, passwordHash);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function syncConfiguredAdminRoleByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !ADMIN_EMAILS.has(normalizedEmail)) {
    return;
  }

  db.prepare(`UPDATE professional_users SET role = 'admin' WHERE email = ? AND role != 'admin'`).run(normalizedEmail);
}

function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM professional_users WHERE email = ?`).get(normalizeEmail(email));
}

function getUserById(userId) {
  return db.prepare(`SELECT * FROM professional_users WHERE id = ?`).get(userId);
}

function getAuthLimiterKey(req, email = "") {
  return `${req.ip || "unknown"}:${normalizeEmail(email)}`;
}

function assertAuthRateLimit(req, res, email = "") {
  const key = getAuthLimiterKey(req, email);
  const now = Date.now();
  const current = authAttemptStore.get(key);

  if (!current || current.resetAt <= now) {
    authAttemptStore.set(key, { count: 1, resetAt: now + AUTH_WINDOW_MS });
    return true;
  }

  if (current.count >= AUTH_MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfterSeconds));
    res.status(429).json({ error: "Trop de tentatives. Réessayez dans quelques minutes." });
    return false;
  }

  current.count += 1;
  authAttemptStore.set(key, current);
  return true;
}

function resetAuthRateLimit(req, email = "") {
  authAttemptStore.delete(getAuthLimiterKey(req, email));
}

app.get("/api/auth/professions", (_req, res) => {
  res.json({ professions: PROFESSIONAL_PROFESSIONS });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/admin-auth/me", (req, res) => {
  const session = getAdminSession(req);
  if (!session || session.user.status !== "active") {
    res.json({ authenticated: false, user: null });
    return;
  }

  res.json({
    authenticated: true,
    user: session.user
  });
});

app.post("/api/admin-auth/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!assertAuthRateLimit(req, res, username)) {
    return;
  }

  if (!username || !password) {
    res.status(400).json({ error: "Identifiant et mot de passe requis." });
    return;
  }

  const user = getAdminUserByUsername(username);
  if (!user || user.status !== "active") {
    res.status(401).json({ error: "Identifiants invalides." });
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    res.status(401).json({ error: "Identifiants invalides." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(`DELETE FROM admin_sessions WHERE user_id = ?`).run(user.id);
  db.prepare(`INSERT INTO admin_sessions (user_id, token, expires_at) VALUES (?, ?, ?)`).run(user.id, token, expiryIso());
  db.prepare(`UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).run(user.id);
  setAdminSessionCookie(res, token);
  resetAuthRateLimit(req, username);

  res.json({
    success: true,
    authenticated: true,
    user: sanitizeAdminUser({
      ...user,
      last_login_at: new Date().toISOString()
    })
  });
});

app.post("/api/admin-auth/logout", (req, res) => {
  const token = req.cookies?.[ADMIN_SESSION_COOKIE];
  if (token) {
    db.prepare(`DELETE FROM admin_sessions WHERE token = ?`).run(token);
  }
  clearAdminSessionCookie(res);
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.json({
      authenticated: false,
      favoriteProductIds: []
    });
    return;
  }

  syncConfiguredAdminRoleByEmail(session.user.email);
  const user = sanitizeUser(getUserById(session.user.id) || session.user);

  if (user?.status && user.status !== "active") {
    db.prepare(`DELETE FROM professional_sessions WHERE token = ?`).run(session.token);
    clearSessionCookie(res);
    res.json({
      authenticated: false,
      favoriteProductIds: []
    });
    return;
  }

  res.json(buildSessionPayload(user));
});

app.post("/api/auth/register", async (req, res) => {
  const firstName = String(req.body?.firstName || "").trim();
  const lastName = String(req.body?.lastName || "").trim();
  const phone = String(req.body?.phone || "").trim();
  const email = normalizeEmail(req.body?.email);
  const profession = String(req.body?.profession || "").trim();
  const password = String(req.body?.password || "");
  const passwordConfirm = String(req.body?.passwordConfirm || "");

  if (!assertAuthRateLimit(req, res, email)) {
    return;
  }

  if (!firstName || !lastName || !phone || !email || !profession || !password || !passwordConfirm) {
    res.status(400).json({ error: "Tous les champs sont requis." });
    return;
  }

  if (password !== passwordConfirm) {
    res.status(400).json({ error: "Les mots de passe ne correspondent pas." });
    return;
  }

  if (!PROFESSIONAL_PROFESSIONS.includes(profession)) {
    res.status(400).json({ error: "Profession invalide." });
    return;
  }

  const existing = db.prepare(`SELECT id FROM professional_users WHERE email = ?`).get(email);
  if (existing) {
    res.status(409).json({ error: "Cette adresse email existe déjà." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db
    .prepare(
      `INSERT INTO professional_users (first_name, last_name, phone, email, profession, password_hash, status, role)
       VALUES (?, ?, ?, ?, ?, ?, 'pending_email', 'professional')`
    )
    .run(firstName, lastName, phone, email, profession, passwordHash);
  syncConfiguredAdminRoleByEmail(email);

  const user = sanitizeUser(getUserById(result.lastInsertRowid));
  const { token } = createEmailVerificationToken(user.id);
  let verificationEmailSent = false;
  let devVerificationUrl = "";

  try {
    const emailResult = await sendEmailVerificationEmail({ req, user, token });
    verificationEmailSent = emailResult.success === true;
    if (emailResult.skipped && process.env.NODE_ENV !== "production") {
      devVerificationUrl = `${getRequestOrigin(req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
      console.log(`Email verification link for ${email}: ${devVerificationUrl}`);
    }
  } catch (error) {
    console.error("Brevo email verification failed:", error);
  }

  resetAuthRateLimit(req, email);

  res.status(201).json({
    success: true,
    verificationRequired: true,
    verificationEmailSent,
    ...(devVerificationUrl ? { verificationUrl: devVerificationUrl } : {}),
    user
  });
});

app.get("/api/auth/verify-email", (req, res) => {
  const token = String(req.query?.token || "").trim();
  const frontendSuccessUrl = getFrontendRedirectUrl("/?emailVerified=1");
  const frontendExpiredUrl = getFrontendRedirectUrl("/?emailVerified=expired");

  if (!token) {
    res.redirect(frontendExpiredUrl);
    return;
  }

  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT v.id as verification_id, v.user_id, v.expires_at, v.used_at, u.email
    FROM professional_email_verifications v
    JOIN professional_users u ON u.id = v.user_id
    WHERE v.token_hash = ?
  `).get(tokenHash);

  if (!row || row.used_at || row.expires_at <= nowIso()) {
    res.redirect(frontendExpiredUrl);
    return;
  }

  db.prepare(`
    UPDATE professional_users
    SET status = CASE WHEN status = 'pending_email' THEN 'active' ELSE status END,
        email_verified_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(row.user_id);

  db.prepare(`
    UPDATE professional_email_verifications
    SET used_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(row.verification_id);

  res.redirect(frontendSuccessUrl);
});

app.post("/api/auth/login", async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || "");

  if (!assertAuthRateLimit(req, res, email)) {
    return;
  }

  if (!email || !password) {
    res.status(400).json({ error: "Email et mot de passe requis." });
    return;
  }

  syncConfiguredAdminRoleByEmail(email);
  const user = getUserByEmail(email);
  if (!user) {
    res.status(401).json({ error: "Identifiants invalides." });
    return;
  }

  if (user.status === "pending_email") {
    res.status(403).json({ error: "Veuillez confirmer votre adresse email avant de vous connecter." });
    return;
  }

  if (user.status && user.status !== "active") {
    res.status(403).json({ error: "Ce compte n’est pas actif." });
    return;
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    res.status(401).json({ error: "Identifiants invalides." });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  db.prepare(`DELETE FROM professional_sessions WHERE user_id = ?`).run(user.id);
  db.prepare(`INSERT INTO professional_sessions (user_id, token, expires_at) VALUES (?, ?, ?)`).run(user.id, token, expiryIso());
  setSessionCookie(res, token);
  resetAuthRateLimit(req, email);

  res.json({
    success: true,
    ...buildSessionPayload(sanitizeUser(user))
  });
});

app.post("/api/auth/logout", (req, res) => {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) {
    db.prepare(`DELETE FROM professional_sessions WHERE token = ?`).run(token);
  }
  clearSessionCookie(res);
  res.json({ success: true });
});

app.post("/api/contact", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = normalizeEmail(req.body?.email);
  const phone = String(req.body?.phone || "").trim();
  const subject = String(req.body?.subject || "").trim();
  const sector = String(req.body?.sector || "").trim();
  const message = String(req.body?.message || "").trim();
  const source = String(req.body?.source || "contact-page").trim() || "contact-page";

  if (!name || !email || !subject || !message) {
    res.status(400).json({ error: "Nom, email, sujet et message sont requis." });
    return;
  }

  const insertResult = db.prepare(`
    INSERT INTO contact_messages (name, email, phone, subject, sector, message, source, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'unread')
  `).run(name, email, phone, subject, sector, message, source);

  try {
    await sendContactNotificationEmail({
      id: insertResult.lastInsertRowid,
      name,
      email,
      phone,
      subject,
      sector,
      message,
      source
    });
  } catch (error) {
    console.error("Brevo contact notification failed:", error);
  }

  res.status(201).json({
    success: true,
    message: "Merci. Votre message a bien été envoyé."
  });
});

app.get("/api/favorites", requireSession, (req, res) => {
  res.json({
    favoriteProductIds: listFavoriteProductIds(req.professionalSession.user.id)
  });
});

app.post("/api/favorites/:productId", requireSession, (req, res) => {
  const productId = String(req.params.productId || "").trim();
  if (!productId) {
    res.status(400).json({ error: "Produit requis." });
    return;
  }

  db
    .prepare(`INSERT OR IGNORE INTO professional_favorites (user_id, product_id) VALUES (?, ?)`)
    .run(req.professionalSession.user.id, productId);

  res.status(201).json({
    success: true,
    favoriteProductIds: listFavoriteProductIds(req.professionalSession.user.id)
  });
});

app.delete("/api/favorites/:productId", requireSession, (req, res) => {
  const productId = String(req.params.productId || "").trim();
  if (!productId) {
    res.status(400).json({ error: "Produit requis." });
    return;
  }

  db
    .prepare(`DELETE FROM professional_favorites WHERE user_id = ? AND product_id = ?`)
    .run(req.professionalSession.user.id, productId);

  res.json({
    success: true,
    favoriteProductIds: listFavoriteProductIds(req.professionalSession.user.id)
  });
});

app.get("/api/catalog/product-statuses", (_req, res) => {
  const statuses = listProductStatusOverrides();
  res.json({
    statuses: statuses.products,
    colorwayStatuses: statuses.colorways
  });
});

app.get("/api/admin/professionals", requireAdmin, (_req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.email,
      u.profession,
      u.status,
      u.created_at
    FROM professional_users u
    ORDER BY u.created_at DESC, u.id DESC
  `).all();

  res.json({
    professionals: rows.map((row) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      profession: row.profession,
      status: row.status || "active",
      createdAt: row.created_at
    }))
  });
});

app.delete("/api/admin/professionals/:userId", requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "Compte invalide." });
    return;
  }

  const existingUser = db.prepare(`SELECT id FROM professional_users WHERE id = ?`).get(userId);
  if (!existingUser) {
    res.status(404).json({ error: "Compte introuvable." });
    return;
  }

  db.prepare(`DELETE FROM professional_users WHERE id = ?`).run(userId);

  res.json({
    success: true,
    userId
  });
});

app.get("/api/admin/product-statuses", requireAdmin, (_req, res) => {
  const statuses = listProductStatusOverrides();
  res.json({
    statuses: statuses.products,
    colorwayStatuses: statuses.colorways
  });
});

app.get("/api/admin/users", requireAdmin, (_req, res) => {
  const users = db.prepare(`
    SELECT id, username, status, created_at, last_login_at
    FROM admin_users
    ORDER BY created_at DESC, id DESC
  `).all();

  res.json({
    users: users.map(sanitizeAdminUser)
  });
});

app.post("/api/admin/users", requireAdmin, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");

  if (!username || !password) {
    res.status(400).json({ error: "Identifiant et mot de passe requis." });
    return;
  }

  if (username.length < 3) {
    res.status(400).json({ error: "Identifiant trop court." });
    return;
  }

  if (password.length < 10) {
    res.status(400).json({ error: "Mot de passe trop court. Minimum 10 caractères." });
    return;
  }

  const existing = getAdminUserByUsername(username);
  if (existing) {
    res.status(409).json({ error: "Cet identifiant existe déjà." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = db.prepare(`
    INSERT INTO admin_users (username, password_hash, status)
    VALUES (?, ?, 'active')
  `).run(username, passwordHash);

  res.status(201).json({
    success: true,
    user: sanitizeAdminUser(db.prepare(`
      SELECT id, username, status, created_at, last_login_at
      FROM admin_users
      WHERE id = ?
    `).get(result.lastInsertRowid))
  });
});

app.patch("/api/admin/product-statuses/:productId", requireAdmin, (req, res) => {
  const productId = normalizeProductId(req.params.productId);
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!productId) {
    res.status(400).json({ error: "Produit invalide." });
    return;
  }

  if (!PRODUCT_AVAILABILITY_STATUSES.has(status)) {
    res.status(400).json({ error: "Statut invalide." });
    return;
  }

  db.prepare(`
    INSERT INTO product_status_overrides (product_id, status, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id) DO UPDATE SET
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(productId, status);

  res.json({
    success: true,
    productId,
    status
  });
});

app.patch("/api/admin/product-statuses/:productId/colorways/:colorwayId", requireAdmin, (req, res) => {
  const productId = normalizeProductId(req.params.productId);
  const colorwayId = normalizeProductId(req.params.colorwayId);
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!productId || !colorwayId) {
    res.status(400).json({ error: "Coloris invalide." });
    return;
  }

  if (!PRODUCT_AVAILABILITY_STATUSES.has(status)) {
    res.status(400).json({ error: "Statut invalide." });
    return;
  }

  db.prepare(`
    INSERT INTO product_colorway_status_overrides (product_id, colorway_id, status, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(product_id, colorway_id) DO UPDATE SET
      status = excluded.status,
      updated_at = CURRENT_TIMESTAMP
  `).run(productId, colorwayId, status);

  res.json({
    success: true,
    productId,
    colorwayId,
    status
  });
});

app.get("/api/admin/product-import-jobs", requireAdmin, (_req, res) => {
  const jobs = db.prepare(`
    SELECT id, url, status, message, created_at, updated_at
    FROM product_import_jobs
    ORDER BY id DESC
    LIMIT 50
  `).all();

  res.json({
    jobs: jobs.map((job) => ({
      id: job.id,
      url: job.url,
      status: job.status,
      message: job.message,
      createdAt: job.created_at,
      updatedAt: job.updated_at
    }))
  });
});

app.post("/api/admin/product-import-jobs", requireAdmin, (req, res) => {
  const url = normalizeSourceUrl(req.body?.url);

  if (!url) {
    res.status(400).json({ error: "Lien produit invalide." });
    return;
  }

  const hostname = new URL(url).hostname;
  const supportedSource = /(^|\.)froca\.com$/i.test(hostname)
    || /(^|\.)yorkwallcoverings\.com$/i.test(hostname)
    || /(^|\.)symphonymills\.com$/i.test(hostname);
  const status = supportedSource ? "queued" : "unsupported";
  const message = supportedSource
    ? "Lien reçu. Import automatique à brancher sur le pipeline catalogue."
    : "Source non supportée pour l'import automatique.";
  const result = db.prepare(`
    INSERT INTO product_import_jobs (url, status, message, created_at, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).run(url, status, message);
  const timestamp = nowIso();

  res.status(201).json({
    success: true,
    job: {
      id: result.lastInsertRowid,
      url,
      status,
      message,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  });
});

app.patch("/api/admin/professionals/:userId/status", requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "Compte invalide." });
    return;
  }

  if (!["active", "blocked"].includes(status)) {
    res.status(400).json({ error: "Statut invalide." });
    return;
  }

  const existingUser = db.prepare(`SELECT id FROM professional_users WHERE id = ?`).get(userId);
  if (!existingUser) {
    res.status(404).json({ error: "Compte introuvable." });
    return;
  }

  db.prepare(`UPDATE professional_users SET status = ? WHERE id = ?`).run(status, userId);
  if (status === "blocked") {
    db.prepare(`DELETE FROM professional_sessions WHERE user_id = ?`).run(userId);
  }

  res.json({
    success: true,
    userId,
    status
  });
});

app.get("/api/admin/contact-messages", requireAdmin, (_req, res) => {
  res.json(listContactMessages());
});

app.patch("/api/admin/contact-messages/:messageId", requireAdmin, (req, res) => {
  const messageId = Number(req.params.messageId);
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!Number.isInteger(messageId) || messageId <= 0) {
    res.status(400).json({ error: "Message invalide." });
    return;
  }

  if (!CONTACT_MESSAGE_STATUSES.has(status)) {
    res.status(400).json({ error: "Statut invalide." });
    return;
  }

  const existingMessage = db.prepare(`SELECT id FROM contact_messages WHERE id = ?`).get(messageId);
  if (!existingMessage) {
    res.status(404).json({ error: "Message introuvable." });
    return;
  }

  db.prepare(`UPDATE contact_messages SET status = ? WHERE id = ?`).run(status, messageId);

  res.json({
    success: true,
    messageId,
    status
  });
});

await ensureDefaultAdminUser();

app.listen(PORT, () => {
  console.log(`ODC API listening on http://localhost:${PORT}`);
});
