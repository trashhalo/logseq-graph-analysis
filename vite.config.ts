import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import logseqPlugin from "vite-plugin-logseq";
import Unocss from "unocss/vite";
import presetWind from "@unocss/preset-wind";
import presetIcons from "@unocss/preset-icons";

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
});
