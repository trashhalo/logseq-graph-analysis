import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import logseqPlugin from "vite-plugin-logseq";
console.log("logseqPlugin", logseqPlugin);
// https://vitejs.dev/config/
export default defineConfig({
  // @ts-ignore
  plugins: [svelte(), logseqPlugin.default()],
});
