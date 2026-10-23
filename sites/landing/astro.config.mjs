import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://netcracker.github.io',
  base: '/qubership-apihub/landing',
  trailingSlash: 'always',
  output: 'static',
  build: {
    assets: '_assets',
  },
});
