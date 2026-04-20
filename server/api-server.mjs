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
const FRONTEND_ORIGIN = String(process.env.FRONTEND_ORIGIN || "").trim().replace(/\/+$/, "");
const API_ALLOWED_ORIGINS = [
  FRONTEND_ORIGIN,
  ...String(process.env.API_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean)
];

const app = express();
app.set("trust proxy", 1);

app.use((req, res, next) => {
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (origin && API_ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
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
    createdAt: row.created_at
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

function buildSessionPayload(user) {
  const sampleRows = db.prepare(`SELECT product_id FROM sample_requests WHERE user_id = ? ORDER BY id DESC`).all(user.id);
  const samplesUsed = sampleRows.length;
  const favoriteProductIds = listFavoriteProductIds(user.id);

  return {
    authenticated: true,
    user,
    sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
    samplesUsed,
    samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - samplesUsed),
    sampleProductIds: sampleRows.map((row) => row.product_id),
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

  req.professionalSession = session;
  next();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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
      favoriteProductIds: []
    });
    return;
  }

  res.json(buildSessionPayload(session.user));
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

  resetAuthRateLimit(req, email);

  res.status(201).json({
    success: true,
    user: sanitizeUser(
      db.prepare(`SELECT * FROM professional_users WHERE id = ?`).get(result.lastInsertRowid)
    )
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

  const user = db.prepare(`SELECT * FROM professional_users WHERE email = ?`).get(email);
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

app.post("/api/samples/request", requireSession, (req, res) => {
  const productId = String(req.body?.productId || "").trim();
  if (!productId) {
    res.status(400).json({ error: "Produit requis." });
    return;
  }

  const userId = req.professionalSession.user.id;
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM sample_requests WHERE user_id = ?`).get(userId);
  const samplesUsed = countRow?.count || 0;

  const existing = db.prepare(`SELECT id FROM sample_requests WHERE user_id = ? AND product_id = ?`).get(userId, productId);
  if (existing) {
    res.status(409).json({
      error: "Cet échantillon a déjà été demandé.",
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed,
      samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - samplesUsed)
    });
    return;
  }

  if (samplesUsed >= PROFESSIONAL_SAMPLE_LIMIT) {
    res.status(409).json({
      error: "Quota d’échantillons atteint.",
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed,
      samplesRemaining: 0
    });
    return;
  }

  db.prepare(`INSERT INTO sample_requests (user_id, product_id) VALUES (?, ?)`).run(userId, productId);
  const nextUsed = samplesUsed + 1;

  res.status(201).json({
    success: true,
    sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
    samplesUsed: nextUsed,
    samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - nextUsed),
    productId
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
  const existingRows = db.prepare(`SELECT product_id FROM sample_requests WHERE user_id = ?`).all(userId);
  const existingProductIds = new Set(existingRows.map((row) => row.product_id));

  const duplicate = productIds.find((productId) => existingProductIds.has(productId));
  if (duplicate) {
    res.status(409).json({
      error: "Au moins un échantillon a déjà été demandé.",
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed: existingRows.length,
      samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - existingRows.length)
    });
    return;
  }

  if (existingRows.length + productIds.length > PROFESSIONAL_SAMPLE_LIMIT) {
    res.status(409).json({
      error: "Le quota maximum de 10 échantillons serait dépassé.",
      sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
      samplesUsed: existingRows.length,
      samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - existingRows.length)
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

  res.status(201).json({
    success: true,
    orderId,
    message: "Odyssée vous contactera par téléphone dès que vos échantillons sont disponibles.",
    sampleLimit: PROFESSIONAL_SAMPLE_LIMIT,
    samplesUsed: nextUsed,
    samplesRemaining: Math.max(0, PROFESSIONAL_SAMPLE_LIMIT - nextUsed),
    sampleProductIds: [...existingProductIds, ...productIds]
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

app.get("/api/admin/professionals", (_req, res) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.phone,
      u.email,
      u.profession,
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
      createdAt: row.created_at,
      sampleCount: row.sample_count
    }))
  });
});

app.listen(PORT, () => {
  console.log(`ODC API listening on http://localhost:${PORT}`);
});
