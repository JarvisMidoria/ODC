import crypto from "node:crypto";
import express from "express";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { db } from "./db.mjs";
import { PROFESSIONAL_PROFESSIONS, PROFESSIONAL_SAMPLE_LIMIT } from "../src/professional-config.js";

const PORT = Number(process.env.ODC_API_PORT || 8787);
const SESSION_COOKIE = "odc_prof_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const AUTH_WINDOW_MS = 1000 * 60 * 15;
const AUTH_MAX_ATTEMPTS = 8;
const SAMPLE_ORDER_STATUSES = new Set(["pending", "processing", "completed"]);
const CONTACT_MESSAGE_STATUSES = new Set(["unread", "read", "archived"]);
const BREVO_API_KEY = String(process.env.BREVO_API_KEY || "").trim();
const CONTACT_NOTIFICATION_TO = String(process.env.CONTACT_NOTIFICATION_TO || "contact@odyssee.ma").trim();
const MAIL_FROM = String(process.env.MAIL_FROM || "contact@odyssee.ma").trim();
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || "").trim().replace(/\/+$/, "");
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
    sampleLimit: Number.isFinite(Number(row.sample_limit)) ? Math.max(0, Number(row.sample_limit)) : null,
    createdAt: row.created_at
  };
}

function isAdminUser(user) {
  return user?.role === "admin";
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

function nowIso() {
  return new Date().toISOString();
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

function listPendingSampleProductIds(userId) {
  return db
    .prepare(`SELECT product_id FROM professional_sample_cart WHERE user_id = ? ORDER BY id DESC`)
    .all(userId)
    .map((row) => row.product_id);
}

function getEffectiveSampleLimit(userOrUserId) {
  if (userOrUserId && typeof userOrUserId === "object") {
    const directLimit = Number(userOrUserId.sampleLimit ?? userOrUserId.sample_limit);
    if (Number.isFinite(directLimit)) {
      return Math.max(0, Math.floor(directLimit));
    }
    if (Number.isInteger(userOrUserId.id) && userOrUserId.id > 0) {
      return getEffectiveSampleLimit(userOrUserId.id);
    }
    return PROFESSIONAL_SAMPLE_LIMIT;
  }

  const userId = Number(userOrUserId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return PROFESSIONAL_SAMPLE_LIMIT;
  }

  const row = db.prepare(`SELECT sample_limit FROM professional_users WHERE id = ?`).get(userId);
  const sampleLimit = Number(row?.sample_limit);
  return Number.isFinite(sampleLimit)
    ? Math.max(0, Math.floor(sampleLimit))
    : PROFESSIONAL_SAMPLE_LIMIT;
}

function sanitizePendingSampleProductIds(userId, productIds) {
  const normalized = [...new Set(productIds.map((item) => String(item || "").trim()).filter(Boolean))];
  const requestedIds = new Set(
    db.prepare(`SELECT product_id FROM sample_requests WHERE user_id = ?`).all(userId).map((row) => row.product_id)
  );
  const samplesUsed = requestedIds.size;
  const sampleLimit = getEffectiveSampleLimit(userId);
  const remainingSlots = Math.max(0, sampleLimit - samplesUsed);

  return normalized
    .filter((productId) => !requestedIds.has(productId))
    .slice(0, remainingSlots);
}

function replacePendingSampleProductIds(userId, productIds) {
  const sanitized = sanitizePendingSampleProductIds(userId, productIds);

  const replace = db.transaction((items) => {
    db.prepare(`DELETE FROM professional_sample_cart WHERE user_id = ?`).run(userId);
    const insert = db.prepare(`INSERT INTO professional_sample_cart (user_id, product_id) VALUES (?, ?)`);
    items.forEach((productId) => {
      insert.run(userId, productId);
    });
  });

  replace(sanitized);
  return sanitized;
}

function listSampleOrders() {
  const orders = db.prepare(`
    SELECT
      o.id,
      o.user_id,
      o.phone_snapshot,
      o.status,
      o.admin_notes,
      o.created_at,
      o.submitted_at,
      u.first_name,
      u.last_name,
      u.email
    FROM sample_orders o
    INNER JOIN professional_users u ON u.id = o.user_id
    ORDER BY o.submitted_at DESC, o.id DESC
  `).all();

  const itemRows = db.prepare(`
    SELECT
      soi.order_id,
      soi.product_id
    FROM sample_order_items soi
    ORDER BY soi.order_id DESC, soi.id ASC
  `).all();

  const itemsByOrderId = new Map();
  itemRows.forEach((row) => {
    const current = itemsByOrderId.get(row.order_id) || [];
    current.push(row.product_id);
    itemsByOrderId.set(row.order_id, current);
  });

  return orders.map((row) => ({
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone_snapshot,
    status: row.status,
    adminNotes: row.admin_notes || "",
    createdAt: row.created_at,
    submittedAt: row.submitted_at,
    productIds: itemsByOrderId.get(row.id) || []
  }));
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

function buildSessionPayload(user) {
  const sampleRows = db.prepare(`SELECT product_id FROM sample_requests WHERE user_id = ? ORDER BY id DESC`).all(user.id);
  const samplesUsed = sampleRows.length;
  const sampleLimit = getEffectiveSampleLimit(user);
  const favoriteProductIds = listFavoriteProductIds(user.id);
  const pendingSampleProductIds = listPendingSampleProductIds(user.id);

  return {
    authenticated: true,
    user,
    sampleLimit,
    samplesUsed,
    samplesRemaining: Math.max(0, sampleLimit - samplesUsed),
    sampleProductIds: sampleRows.map((row) => row.product_id),
    pendingSampleProductIds,
    favoriteProductIds
  };
}

function purgeExpiredSessions() {
  db.prepare(`DELETE FROM professional_sessions WHERE expires_at IS NOT NULL AND expires_at <= ?`).run(nowIso());
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
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "Session administrateur requise." });
    return;
  }

  syncConfiguredAdminRoleByEmail(session.user.email);
  const user = sanitizeUser(getUserById(session.user.id) || session.user);

  if (user?.status && user.status !== "active") {
    db.prepare(`DELETE FROM professional_sessions WHERE token = ?`).run(session.token);
    clearSessionCookie(res);
    res.status(403).json({ error: "Ce compte n’est pas actif." });
    return;
  }

  if (!isAdminUser(user)) {
    res.status(403).json({ error: "Accès administrateur requis." });
    return;
  }

  req.professionalSession = {
    ...session,
    user
  };
  next();
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

app.get("/api/auth/me", (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.json({
      authenticated: false,
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed: 0,
      samplesRemaining: PROFESSIONAL_SAMPLE_LIMIT,
      sampleProductIds: [],
      pendingSampleProductIds: [],
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
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed: 0,
      samplesRemaining: PROFESSIONAL_SAMPLE_LIMIT,
      sampleProductIds: [],
      pendingSampleProductIds: [],
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
       VALUES (?, ?, ?, ?, ?, ?, 'active', 'professional')`
    )
    .run(firstName, lastName, phone, email, profession, passwordHash);
  syncConfiguredAdminRoleByEmail(email);

  resetAuthRateLimit(req, email);

  res.status(201).json({
    success: true,
    user: sanitizeUser(getUserById(result.lastInsertRowid))
  });
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

app.post("/api/samples/checkout", requireSession, (req, res) => {
  const productIds = Array.isArray(req.body?.productIds)
    ? [...new Set(req.body.productIds.map((item) => String(item || "").trim()).filter(Boolean))]
    : [];

  if (!productIds.length) {
    res.status(400).json({ error: "Aucun échantillon sélectionné." });
    return;
  }

  const userId = req.professionalSession.user.id;
  const sampleLimit = getEffectiveSampleLimit(req.professionalSession.user);
  const existingRows = db.prepare(`SELECT product_id FROM sample_requests WHERE user_id = ?`).all(userId);
  const existingProductIds = new Set(existingRows.map((row) => row.product_id));

  const duplicate = productIds.find((productId) => existingProductIds.has(productId));
  if (duplicate) {
    res.status(409).json({
      error: "Au moins un échantillon a déjà été demandé.",
      sampleLimit,
      samplesUsed: existingRows.length,
      samplesRemaining: Math.max(0, sampleLimit - existingRows.length)
    });
    return;
  }

  if (existingRows.length + productIds.length > sampleLimit) {
    res.status(409).json({
      error: `Le quota maximum de ${sampleLimit} échantillon${sampleLimit > 1 ? "s" : ""} serait dépassé.`,
      sampleLimit,
      samplesUsed: existingRows.length,
      samplesRemaining: Math.max(0, sampleLimit - existingRows.length)
    });
    return;
  }

  const createOrder = db.transaction((items) => {
    const orderResult = db
      .prepare(`INSERT INTO sample_orders (user_id, phone_snapshot, status) VALUES (?, ?, 'pending')`)
      .run(userId, req.professionalSession.user.phone);

    const orderId = orderResult.lastInsertRowid;
    const insertOrderItem = db.prepare(`INSERT INTO sample_order_items (order_id, product_id) VALUES (?, ?)`);
    const insertSampleRequest = db.prepare(`INSERT INTO sample_requests (user_id, product_id) VALUES (?, ?)`);

    items.forEach((productId) => {
      insertOrderItem.run(orderId, productId);
      insertSampleRequest.run(userId, productId);
    });

    return orderId;
  });

  const orderId = createOrder(productIds);
  const nextUsed = existingRows.length + productIds.length;
  const nextPendingSampleProductIds = listPendingSampleProductIds(userId).filter((productId) => !productIds.includes(productId));
  replacePendingSampleProductIds(userId, nextPendingSampleProductIds);

  res.status(201).json({
    success: true,
    orderId,
    message: "Odyssée vous contactera par téléphone dès que vos échantillons sont disponibles.",
    sampleLimit,
    samplesUsed: nextUsed,
    samplesRemaining: Math.max(0, sampleLimit - nextUsed),
    sampleProductIds: [...existingProductIds, ...productIds],
    pendingSampleProductIds: nextPendingSampleProductIds
  });
});

app.get("/api/samples/pending", requireSession, (req, res) => {
  res.json({
    pendingSampleProductIds: listPendingSampleProductIds(req.professionalSession.user.id)
  });
});

app.put("/api/samples/pending", requireSession, (req, res) => {
  const productIds = Array.isArray(req.body?.productIds)
    ? req.body.productIds
    : [];

  const pendingSampleProductIds = replacePendingSampleProductIds(
    req.professionalSession.user.id,
    productIds
  );

  res.json({
    success: true,
    pendingSampleProductIds
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
      u.sample_limit,
      u.created_at,
      COUNT(sr.id) AS sample_count
    FROM professional_users u
    LEFT JOIN sample_requests sr ON sr.user_id = u.id
    GROUP BY u.id
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
      sampleLimit: Number.isFinite(Number(row.sample_limit)) ? Math.max(0, Number(row.sample_limit)) : PROFESSIONAL_SAMPLE_LIMIT,
      createdAt: row.created_at,
      sampleCount: row.sample_count
    }))
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

  if (userId === req.professionalSession.user.id && status === "blocked") {
    res.status(400).json({ error: "Vous ne pouvez pas bloquer votre propre compte administrateur." });
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

app.patch("/api/admin/professionals/:userId/sample-limit", requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  const sampleLimit = Number(req.body?.sampleLimit);

  if (!Number.isInteger(userId) || userId <= 0) {
    res.status(400).json({ error: "Compte invalide." });
    return;
  }

  if (!Number.isFinite(sampleLimit) || sampleLimit < 0) {
    res.status(400).json({ error: "Quota invalide." });
    return;
  }

  const normalizedSampleLimit = Math.floor(sampleLimit);
  const existingUser = db.prepare(`SELECT id FROM professional_users WHERE id = ?`).get(userId);
  if (!existingUser) {
    res.status(404).json({ error: "Compte introuvable." });
    return;
  }

  db.prepare(`UPDATE professional_users SET sample_limit = ? WHERE id = ?`).run(normalizedSampleLimit, userId);

  res.json({
    success: true,
    userId,
    sampleLimit: normalizedSampleLimit
  });
});

app.get("/api/admin/sample-orders", requireAdmin, (_req, res) => {
  res.json({
    sampleOrders: listSampleOrders()
  });
});

app.patch("/api/admin/sample-orders/:orderId", requireAdmin, (req, res) => {
  const orderId = Number(req.params.orderId);
  const statusValue = req.body?.status;
  const adminNotesValue = req.body?.adminNotes;

  if (!Number.isInteger(orderId) || orderId <= 0) {
    res.status(400).json({ error: "Commande invalide." });
    return;
  }

  const existingOrder = db.prepare(`SELECT id FROM sample_orders WHERE id = ?`).get(orderId);
  if (!existingOrder) {
    res.status(404).json({ error: "Commande introuvable." });
    return;
  }

  const updates = [];
  const params = [];

  if (statusValue !== undefined) {
    const normalizedStatus = String(statusValue || "").trim().toLowerCase();
    if (!SAMPLE_ORDER_STATUSES.has(normalizedStatus)) {
      res.status(400).json({ error: "Statut invalide." });
      return;
    }
    updates.push("status = ?");
    params.push(normalizedStatus);
  }

  if (adminNotesValue !== undefined) {
    updates.push("admin_notes = ?");
    params.push(String(adminNotesValue || "").trim());
  }

  if (!updates.length) {
    res.status(400).json({ error: "Aucune mise à jour reçue." });
    return;
  }

  params.push(orderId);
  db.prepare(`UPDATE sample_orders SET ${updates.join(", ")} WHERE id = ?`).run(...params);

  const updatedOrder = db
    .prepare(`SELECT status, admin_notes FROM sample_orders WHERE id = ?`)
    .get(orderId);

  res.json({
    success: true,
    orderId,
    status: updatedOrder?.status || "pending",
    adminNotes: updatedOrder?.admin_notes || ""
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

app.listen(PORT, () => {
  console.log(`ODC API listening on http://localhost:${PORT}`);
});
