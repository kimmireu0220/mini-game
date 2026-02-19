import fs from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const url = env.SUPABASE_URL ?? "";
  const key = env.SUPABASE_ANON_KEY ?? "";
  // GitHub Pages: VITE_BASE_PATH=/mini-game/ 로 빌드

  const base = env.VITE_BASE_PATH ?? "/";
  return {
    base,
    plugins: [
      react(),
      // dev: /games/*/config.example.js 요청 시 .env로 치환. build: dist/games/*/config.example.js 치환.
      {
        name: "game-config-inject",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const match = req.url?.match(/^\/games\/([^/]+)\/config\.example\.js(?:\?.*)?$/);
            if (!match) return next();
            const slug = match[1];
            const gameDir = path.resolve(process.cwd(), "public", "games", slug);
            const configPath = path.join(gameDir, "config.example.js");
            if (!fs.existsSync(configPath)) return next();
            let body = fs.readFileSync(configPath, "utf-8");
            body = body.replace("__SUPABASE_URL__", url).replace("__SUPABASE_ANON_KEY__", key);
            res.setHeader("Content-Type", "application/javascript; charset=utf-8");
            res.end(body);
          });
        },
        closeBundle() {
          const gamesDir = path.resolve(process.cwd(), "dist", "games");
          if (!fs.existsSync(gamesDir)) return;
          for (const slug of fs.readdirSync(gamesDir)) {
            const configPath = path.join(gamesDir, slug, "config.example.js");
            if (!fs.existsSync(configPath)) continue;
            let body = fs.readFileSync(configPath, "utf-8");
            body = body.replace("__SUPABASE_URL__", url).replace("__SUPABASE_ANON_KEY__", key);
            fs.writeFileSync(configPath, body);
          }
        },
      },
    ],
  };
});
