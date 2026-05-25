import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ isSsrBuild }) => ({
  build: {
    rollupOptions: isSsrBuild
      ? {
          input: "./server/app.ts",
        }
      : undefined,
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    ...(isSsrBuild
      ? []
      : [
          VitePWA({
            strategies: "injectManifest",
            srcDir: "app",
            filename: "sw.ts",
            registerType: "autoUpdate",
            injectRegister: false,
            manifest: false,
            devOptions: { enabled: false },
            injectManifest: {
              globPatterns: ["**/*.{js,css,woff,woff2,ttf}"],
              additionalManifestEntries: [
                { url: "/offline.html", revision: "1" },
                { url: "/cards/masks/m18.png", revision: "1" },
              ],
            },
          }),
        ]),
  ],
  resolve: {
    tsconfigPaths: true,
  },
}));
