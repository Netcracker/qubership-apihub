# Qubership APIHUB landing

The product landing of [Qubership APIHUB](https://github.com/Netcracker/qubership-apihub): a static
[Astro](https://astro.build/) site with [Tailwind CSS](https://tailwindcss.com/). It is the Nx project `landing`
and a package of the pnpm workspace. It is in no release group, so a landing commit bumps no version.

## Run it

Run these from the repository root, after `pnpm install`:

```bash
pnpm exec nx run landing:dev      # dev server on http://localhost:4321/qubership-apihub/landing/
pnpm exec nx run landing:build    # static site in sites/landing/dist/
pnpm exec nx run landing:preview  # serve dist/ after a build
```

Nx caches the build. `dev` and `build` first copy the architecture diagrams, see [Diagrams](#diagrams).

## Where it is published

The site is served at <https://netcracker.github.io/qubership-apihub/landing/>. The Pages workflow builds it and
publishes it together with the docs site. `base` in `astro.config.mjs` is `/qubership-apihub/landing`, so link to
landing pages with `withBase(...)` from `src/lib/paths.ts`, never with a root-absolute path.

## Where content lives

- `src/data/*.ts`: shared copy, navigation, and the radar. `src/data/content.ts` is the one place for outbound URLs
  (`SITE_ROOT`, `DOCS_URL`, `REPO_URL`, and so on); pages import these constants.
- `src/content/`: Markdown collections. `releases/` feeds `/releases/` and `use-cases/` feeds `/use-cases/`. The schemas
  are in `src/content/config.ts`.
- `src/pages/`: one `.astro` file per route, including the `/docs/architecture/` pages.
- `public/images/`: static images. The architecture diagrams there are generated.

## Diagrams

The architecture diagrams are SVG files in `docs/images/architecture/`, shared with the root README and the docs.
`scripts/copy-diagrams.mjs` copies them into `public/images/architecture/`, which is git-ignored. Edit the files in
`docs/images/architecture/`, not the copies.

## Release cards

Each product release has a card, `src/content/releases/v<X>-<Y>-<Z>.md`. Add it during the release, as a pull request
into `release`; see the step "Add the landing release card" in
[the release process](../../docs/development/release-process.md). The Release finish dry run warns when the card is
missing. The "Latest Release" stat and the hero badge take the highest version among the cards
(`src/lib/latest-release.ts`). The `apihub-landing-refresh` agent skill drafts a card from the product release notes.

## Capability model

`src/data/capability-model.json` is a copy of a file that is maintained outside this repository. Update it by hand
when the source changes.
