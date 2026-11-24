# APIHUB PR board

Standalone React and Vite contributor tool, registered as the Nx project `pr-board`.
Read [the module README](README.md) before changing behavior.
Follow the [test stack ADR](../../docs/internal/adr/0011-pr-board-test-stack.md).

- Run commands from the monorepo root: `pnpm exec nx run pr-board:<target>`.
- Targets: `dev` (fictional fixtures), `dev:live` (personal-token GitHub access), `build`, `test`, and `test:e2e`.
- `test` runs types and unit coverage. Browser tests use Chromium and a separate mock server.
- Browser and screenshot tests are local tools; run them before a pull request that changes the UI.
- Run `screenshot-test` or `regenerate-screenshots` in the pinned Linux container; inspect changed Linux baselines.
- Set `DOCKER_BINARY` to override the container engine (Podman on Windows, Docker elsewhere).
- Keep official repository presets in `src/defaults.ts` and detection defaults in `src/model/areas.ts`.
- `src/build-defaults.ts` validates optional team overrides. Keep build variables in the Nx build inputs.
- Put pure classification, parsing, and URL logic in `src/model/` or `src/board/`, with matching unit tests.
- Use fictional repositories and people for mock data. Configuration tests may check the official presets.
- Personal tokens stay in browser storage and go only to GitHub. Builds require no credential or PR snapshot.
- The root Pages workflow publishes `dist/`; this module has no standalone deployment workflow or release group.
