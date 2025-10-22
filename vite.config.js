import { defineConfig } from 'vite';

export default defineConfig({
  // Use a relative base path — helps prevent 404 errors on Netlify previews
  base: './',

  // Ensure environment variables prefixed with VITE_ are loaded
  envPrefix: 'VITE_',
});
