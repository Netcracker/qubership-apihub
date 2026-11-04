# APIHUB PR board

Standalone React 19 and Vite contributor tool, registered as the Nx project `pr-board`.
Read [the module README](README.md) and [the requirements](docs/requirements/README.md) before changing behavior.

- Run commands from the monorepo root: `pnpm exec nx run pr-board:<target>`.
- Targets: `dev` (fictional fixtures), `dev:live` (personal-token GitHub access), `build`, `test`, and `test:e2e`.
- `test` runs types, unit coverage, and requirement checks. Browser tests use Chromium and a separate mock server.
- Run screenshot tests on Windows and with `test:linux` in the pinned Linux container; inspect changed baselines.
- Keep official repository presets in `src/defaults.ts` and detection defaults in `src/model/areas.ts`.
- `src/build-defaults.ts` validates optional team overrides. Keep build variables in the Nx build inputs.
- Put pure classification, parsing, and URL logic in `src/model/` or `src/board/`, with matching unit tests.
- Update requirement text and tests together when behavior changes. Preserve existing requirement IDs.
- Use fictional repositories and people for mock data. Configuration tests may check the official presets.
- Personal tokens stay in browser storage and go only to GitHub. Builds require no credential or PR snapshot.
- The root Pages workflow publishes `dist/`; this module has no standalone deployment workflow or release group.
