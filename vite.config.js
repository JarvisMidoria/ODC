import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import { devContactPlugin } from "./scripts/dev-contact-plugin.mjs";

function collectHtmlFiles(directory, relative = "") {
  const entries = readdirSync(resolve(directory, relative));
  const files = {};

  for (const entry of entries) {
    if (["dist", "node_modules", ".git", ".vercel", "Odyssee", "tmp", "docs", "data", "output", "tests"].includes(entry)) {
      continue;
    }

    const nextRelative = relative ? `${relative}/${entry}` : entry;
    const absolute = resolve(directory, nextRelative);
    const stats = statSync(absolute);

    if (stats.isDirectory()) {
      Object.assign(files, collectHtmlFiles(directory, nextRelative));
      continue;
    }

    if (entry.endsWith(".html")) {
      const key = nextRelative.replace(/[/.]/g, "_");
      files[key] = absolute;
    }
  }

  return files;
}

function stripSecureCookie(proxy) {
  proxy.on("proxyRes", (proxyRes) => {
    const cookies = proxyRes.headers["set-cookie"];

    if (!Array.isArray(cookies) || cookies.length === 0) {
      return;
    }

    proxyRes.headers["set-cookie"] = cookies.map((cookie) =>
      cookie.replace(/;\s*Secure/gi, "")
    );
  });
}

function proxiedRoute() {
  return {
    target: "https://www.odyssee.ma",
    changeOrigin: true,
    configure: stripSecureCookie
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of ["BREVO_SMTP_USER", "BREVO_SMTP_PASSWORD", "MAIL_FROM", "CONTACT_NOTIFICATION_TO", "CONTACT_SITE_ORIGIN", "CONTACT_VERIFY_ONLY"]) {
    if (env[key] !== undefined && process.env[key] === undefined) process.env[key] = env[key];
  }
  return {
    plugins: [devContactPlugin()],
    server: {
      proxy: {
        "/assets": proxiedRoute(),
        "/universal": proxiedRoute()
      }
    },
    build: {
      rollupOptions: {
        input: collectHtmlFiles(__dirname)
      }
    }
  };
});
