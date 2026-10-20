---
name: apihub-landing-refresh
description: "Refresh the APIHUB product landing in sites/landing from the product's GitHub releases and the docs site: versions, stats, release cards, and outbound links. Use when the user asks to update or sync the landing copy, the latest version, or the release timeline, or to refresh the landing after a release."
---

# Refresh the APIHUB landing

The landing is the Astro site in `sites/landing/`. It is published at
`https://netcracker.github.io/qubership-apihub/landing/` by the Pages workflow. Start with
`sites/landing/README.md`.

## Sources

Fetch these from the network. Do not invent version numbers or dates. When a page cannot be reached, say so and
leave the value unchanged or mark it as needing a manual check.

1. **Product releases.** The GitHub Releases of `Netcracker/qubership-apihub`. The release of the product tag
   (`X.Y.Z`, without a component prefix) lists the sprint work items, the breaking changes, and the version of every
   component. Module releases (`<component>/<version>`) carry the details. The monorepo generates these notes; see
   `docs/development/release-process.md`, section "Release notes".
   Use `gh release list` and `gh release view <tag>`, both with `--repo Netcracker/qubership-apihub`.
2. **Docs site.** `https://netcracker.github.io/qubership-apihub/docs/`: the installation, user, and admin guides.
   Check that the pages behind the landing links still exist.

## Files to edit

| Area | File |
|------|------|
| Outbound URLs (`SITE_ROOT`, `DOCS_URL`, `INSTALL_URL`, `ADMIN_URL`, `USER_GUIDE_URL`, `REPO_URL`, and the rest), the "Latest Release" stat, pillars, deploy and section cards | `sites/landing/src/data/content.ts` |
| Hero badge and version text that a page repeats | `sites/landing/src/pages/*.astro` |
| Release card | `sites/landing/src/content/releases/v<X>-<Y>-<Z>.md` |
| Use-case cards | `sites/landing/src/content/use-cases/*.md` |

Rules:

- `content.ts` is the one place for outbound URLs. Add or change a link there and import the constant. Do not paste a
  URL into a page.
- Links to a page of the landing go through `withBase(...)` from `sites/landing/src/lib/paths.ts`. Never write a
  root-absolute `/...` link.
- Do not change `base` or `site` in `astro.config.mjs` without asking: it moves every URL of the site.

## Release cards

A card is one Markdown file per product version, named `v<X>-<Y>-<Z>.md`. Copy the frontmatter of the newest card:
`version`, `date`, `latest`, and `highlights`. Build the body from the product release notes.

1. Take the version, the date, and the sprint work items from the release of the product tag.
2. Write three to five highlights, in the voice of the existing cards: what a user can now do.
3. Set `latest: true` on the new card and remove it from the previous one.
4. Update the "Latest Release" value in `stats` in `content.ts`, and any hero badge that repeats the version.

A release card goes into the repository through a pull request into `release`, as part of the release; see the step
"Add the landing release card" in the release process.

## Verify

1. Run `pnpm exec nx run landing:build`. It must succeed.
2. Spot-check that the external links you touched still answer.
3. Keep the existing tone, section order, and Tailwind layout. Prefer small factual edits to rewrites.
