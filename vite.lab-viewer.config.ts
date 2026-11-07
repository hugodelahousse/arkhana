// Builds the offline deck viewer used by the lab deck preview's "Preview artifact"
// export: one classic script and one stylesheet (fonts inlined), so the exported
// folder works when opened from disk. Run with `pnpm build:lab-viewer`.
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  publicDir: false,
  mode: "production",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  // React is bundled in its production build, which has no jsxDEV: compile JSX for production too.
  oxc: { jsx: { runtime: "automatic", development: false } },
  build: {
    outDir: "public/lab-deck/viewer",
    emptyOutDir: true,
    // Inline the fonts into the stylesheet: the export then only needs viewer.js + viewer.css.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    lib: {
      entry: "app/lab-viewer/main.tsx",
      formats: ["iife"],
      name: "ArkhanaDeckViewer",
      fileName: () => "viewer.js",
      cssFileName: "viewer",
    },
  },
});
