import { defineConfig } from "vitest/config";
import { configDefaults } from "vitest/config";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env and server/.env
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, "server/.env") });

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["server/src/**/*.ts", "client/src/**/*.ts", "shared/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/node_modules/**",
        "**/dist/**",
        "**/coverage/**",
        ...configDefaults.exclude,
        "tests/**/*.e2e.{ts,tsx}",
        "playwright.config.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "./shared"),
      "@server": path.resolve(__dirname, "./server/src"),
      "@client": path.resolve(__dirname, "./client/src"),
    },
  },
});
