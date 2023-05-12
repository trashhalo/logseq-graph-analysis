import { defineConfig } from "vitest/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import logseqPlugin from "vite-plugin-logseq";
import Unocss from "unocss/vite";
import presetWind from "@unocss/preset-wind";
import presetIcons from "@unocss/preset-icons";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    // @ts-ignore
    logseqPlugin.default(),
    Unocss({
      presets: [presetIcons(), presetWind()],
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@', replacement: path.resolve(__dirname, '/src')
      }
    ]
  },
  test: {
    includeSource: ["src/**/*.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
