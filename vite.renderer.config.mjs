import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from "vite";
import VuePlugin from "@vitejs/plugin-vue";
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    VuePlugin(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
});
