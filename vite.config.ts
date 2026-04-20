import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Root path when served from a custom domain (www.antnee.net); override via
  // VITE_BASE_PATH for subpath deploys.
  base: process.env.VITE_BASE_PATH ?? '/',
});
