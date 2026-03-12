import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          // Charts - heavy visualization library
          if (id.includes("recharts") || id.includes("d3")) {
            return "vendor-charts";
          }

          // Animation
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }

          // Markdown rendering
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark")) {
            return "vendor-integrations";
          }

          // Data fetching and routing
          if (
            id.includes("react-router") ||
            id.includes("@tanstack/react-query") ||
            id.includes("@tanstack/query-core")
          ) {
            return "vendor-routing";
          }

          // Form handling
          if (
            id.includes("react-hook-form") ||
            id.includes("@hookform") ||
            id.includes("zod")
          ) {
            return "vendor-forms";
          }

          // Date handling
          if (id.includes("date-fns") || id.includes("react-day-picker")) {
            return "vendor-dates";
          }

          // Utilities
          if (
            id.includes("lucide-react") ||
            id.includes("class-variance-authority") ||
            id.includes("clsx") ||
            id.includes("tailwind-merge")
          ) {
            return "vendor-utils";
          }

          // EVERYTHING else including React, Radix UI, and all shared dependencies
          // This prevents circular dependencies by having one single base chunk
          return "vendor-core";
        },
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
