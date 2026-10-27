import { createHash } from "node:crypto";
import path from "node:path";
import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";
import { defineConfig } from "vite";
import { patchCssModules } from "vite-css-modules";

export default defineConfig({
  server: { port: 3000, strictPort: true },
  plugins: [
    patchCssModules({ exportMode: "default" }),
    vinext(),
    cloudflare({
      viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
    }),
  ],
  css: {
    modules: {
      generateScopedName(name: string, filename: string) {
        const relativePath = path
          .relative(import.meta.dirname, filename.replace(/\?.*$/, ""))
          .replaceAll("\\", "/");
        return `_${name}_${createHash("sha256").update(relativePath).digest("hex").slice(0, 7)}`;
      },
    },
  },
});
