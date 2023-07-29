import path from "path";
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import UnoCSS from "unocss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact({ devToolsEnabled: true }), UnoCSS()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
