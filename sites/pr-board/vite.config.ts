import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { DEV_REPOSITORY } from './dev/fixtures/people.ts';
import { devMocks, LIVE_MODE } from './dev/mock-plugin.ts';
import { parseRepositories, REPO_VARIABLE, repositoryName } from './src/repository.ts';
import { resolveBuildDefaults } from './src/build-defaults.ts';

export default defineConfig(({ command, mode }) => {
  // Builds and live mode may name real repositories in PR_BOARD_REPO, as defaults; without it the page takes them from
  // the link or Settings, like the published page (DATA-1). Mock data is fictional, so the dev server shows the
  // fictional repository whatever the variable says.
  const live = mode === LIVE_MODE;
  const mock = command === 'serve' && !live;
  const defaults = resolveBuildDefaults(process.env, mock);
  const value = command === 'build' || live ? process.env[REPO_VARIABLE] : DEV_REPOSITORY;
  const repositories = value ? parseRepositories(value) : [];
  return {
    // Relative asset paths, so the site works under any GitHub Pages path.
    base: './',
    plugins: [react(), devMocks({ repositories, live })],
    define: {
      __PR_BOARD_REPO__: JSON.stringify(repositories.map(repositoryName).join(',')),
      __PR_BOARD_DEFAULTS__: JSON.stringify(defaults),
    },
    server: { port: 5173 },
    build: { outDir: 'dist', emptyOutDir: true },
  };
});
