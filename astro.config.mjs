import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true
    }
  }),
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['drizzle-orm', 'drizzle-orm/d1', 'zod']
    }
  },
});
