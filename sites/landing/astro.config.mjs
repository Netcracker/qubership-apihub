import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  site: 'https://netcracker.github.io',
  base: '/qubership-apihub/landing',
  trailingSlash: 'always',
  integrations: [tailwind()],
  output: 'static',
  build: {
    assets: '_assets',
  },
});
