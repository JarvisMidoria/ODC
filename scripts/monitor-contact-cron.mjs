// Read-only remote checks. HEAD authenticates SMTP but never sends an email.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const statePath = new URL("../.runlogs/contact-cron-monitor.json", import.meta.url);
const run = promisify(execFile);
let state = {};
try { state = JSON.parse(await readFile(statePath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }

// Use only after observing SMTP acceptance in the endpoint or Brevo logs.
if (process.argv[2] === "--record-success") {
  const observed = new Date(process.argv[3]);
  if (!Number.isFinite(observed.getTime()) || observed.getTime() > Date.now() + 60_000) throw new Error("Invalid observed timestamp");
  state.lastAcceptedAt = observed.toISOString();
  await mkdir(new URL("../.runlogs/", import.meta.url), { recursive: true, mode: 0o700 });
  await writeFile(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ recorded: state.lastAcceptedAt }));
  process.exit(0);
}

const report = { checkedAt: new Date().toISOString(), smtpConnection: "unknown", cronConfigured: false, failures: [] };
try {
  const secret = (await readFile(new URL("../tmp/contact-secrets/CRON_SECRET", import.meta.url), "utf8")).trim();
  if (!secret) throw new Error("Missing local monitoring credential");
  const response = await fetch("https://www.odyssee.ma/api/contact-monthly-test", {
    method: "HEAD", headers: { Authorization: `Bearer ${secret}` },
    redirect: "error", signal: AbortSignal.timeout(40_000)
  });
  report.smtpConnection = response.status === 204 ? "verified_without_email" : `http_${response.status}`;
  if (response.status !== 204) report.failures.push("SMTP_CONNECTION_CHECK_FAILED");
} catch { report.failures.push("SMTP_CONNECTION_CHECK_UNAVAILABLE"); }

try {
  const { stdout } = await run("vercel", ["api", "/v9/projects/prj_Bt0AZqm8lM9txr3suR2YgsgLYBgq?teamId=team_31OARgDHBgzjgUSDgovFtSpZ"], { cwd: root, timeout: 20_000 });
  const { crons } = JSON.parse(stdout);
  report.cronConfigured = Boolean(crons && !crons.disabledAt && crons.definitions?.some(item => item.path === "/api/contact-monthly-test" && item.schedule === "0 8 1 * *"));
  if (!report.cronConfigured) report.failures.push("MONTHLY_CRON_MISSING_OR_DISABLED");
} catch { report.failures.push("CRON_CONFIGURATION_CHECK_UNAVAILABLE"); }

try {
  const { stdout } = await run("vercel", ["logs", "--environment", "production", "--no-branch", "--since", "1h", "--json", "--limit", "100", "--query", "CONTACT_MONTHLY_TEST"], { cwd: root, timeout: 25_000 });
  for (const line of stdout.split("\n").filter(Boolean)) {
    const entry = JSON.parse(line);
    if (entry.requestPath !== "/api/contact-monthly-test") continue;
    if (entry.message?.includes("CONTACT_MONTHLY_TEST_ACCEPTED") && entry.responseStatusCode === 200) {
      const timestamp = new Date(entry.timestamp).toISOString();
      if (!state.lastAcceptedAt || timestamp > state.lastAcceptedAt) state.lastAcceptedAt = timestamp;
    }
    if (entry.message?.includes("CONTACT_MONTHLY_TEST_FAILED")) report.failures.push("RECENT_MONTHLY_TEST_FAILURE");
  }
} catch { report.logCheck = "unavailable"; }

const now = new Date();
// Give the 1st-of-month 08:00–09:00 UTC Hobby window a full day's grace.
const dueMonth = now.getUTCDate() >= 2 ? now.toISOString().slice(0, 7) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
report.lastAcceptedAt = state.lastAcceptedAt || null;
report.needsMonthlyEvidence = !state.lastAcceptedAt || state.lastAcceptedAt.slice(0, 7) < dueMonth;
report.evidenceInstruction = report.needsMonthlyEvidence ? "Check Brevo transactional logs for the monthly test. Record an actual accepted/sent timestamp, or alert that execution cannot be confirmed. Do not send a replacement email." : null;
await mkdir(new URL("../.runlogs/", import.meta.url), { recursive: true, mode: 0o700 });
await writeFile(statePath, JSON.stringify({ ...state, lastCheck: report }, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
