import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";

function collectHtmlFiles(directory, relative = "") {
  const entries = readdirSync(resolve(directory, relative));
  const files = {};

  for (const entry of entries) {
    if (["dist", "node_modules", ".git"].includes(entry)) {
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

export default defineConfig({
  server: {
    proxy: {
      "/api/auth": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/samples": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/favorites": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api/admin": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true
      },
      "/api": proxiedRoute(),
      "/assets": proxiedRoute(),
      "/universal": proxiedRoute()
    }
  },
  build: {
    rollupOptions: {
      input: collectHtmlFiles(__dirname)
    }
  }
});
