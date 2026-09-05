import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.png",
        "apple-touch-icon.png",
        "assets/logo-on-the-money.svg",
        "assets/cherub-invest.svg",
        "assets/cherub-build.svg",
        "assets/corner-ornaments.svg",
        "assets/divider-flourish-1.svg",
        "assets/divider-flourish-2.svg",
        "assets/divider-flourish-3.svg",
        "assets/section-accent.svg",
        "assets/cash-stack.svg",
        "assets/dollar-bill.svg",
        "assets/coin.svg",
        "assets/laurel.svg",
        "assets/paper-noise.svg",
        "assets/texture-1.svg",
        "assets/texture-2.svg",
        "assets/texture-3.svg",
        "assets/otm-background.png",
      ],
      manifest: {
        name: "On The Money",
        short_name: "On The Money",
        description: "Personal finance tracker",
        theme_color: "#0a0f14",
        background_color: "#0a0f14",
        display: "standalone",
        lang: "en",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
