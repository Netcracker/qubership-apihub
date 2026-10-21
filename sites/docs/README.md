# Documentation site

The Starlight site that publishes [`docs/`](../../docs/) at
[netcracker.github.io/qubership-apihub/docs/](https://netcracker.github.io/qubership-apihub/docs/). The repository's
Markdown is the source; the site is a view of it, so you edit `docs/`, never this folder's content.
`docs/internal/` and `docs/pages/` are not published.

## Build and run

```bash
pnpm exec nx run docs-site:build    # sites/docs/dist/, with the link check and the Pagefind index
pnpm exec nx run docs-site:test     # unit tests of the sync rules
pnpm --dir sites/docs run dev       # local server at http://localhost:4321/qubership-apihub/docs/
```

`dev` and `build` first run `scripts/sync-docs.mjs`, which writes `src/content/docs/` and `public/` (both
git-ignored). `dev` does not watch `docs/`: restart it, or run `pnpm --dir sites/docs run sync`, after an edit there.
`pages.yml` copies `dist/` to `docs/` of the Pages site (see
[the release process](../../docs/development/release-process.md)).

## What the sync does

- Every `docs/**/*.md` outside `internal/` and `pages/` becomes a page. `README.md` and `index.md` are the page of
  their folder; every folder name and filename goes through github-slugger, as in Astro (`Portal User Guide.md` gives
  `portal-user-guide/`).
- The first H1 becomes the page title and is removed from the body. Front matter in the source is kept.
- Each page gets an edit link to its source on GitHub, on `develop`.
- Links to Markdown files in `docs/` become page links (`/qubership-apihub/docs/<slug>/#anchor`). Links to a folder
  with a `README.md` become its page.
- Links to `docs/internal/`, to files outside `docs/`, and to non-image files become GitHub links (`blob/` for files,
  `tree/` for folders) on the ref in `DOCS_GITHUB_REF`, or on `develop` when it is unset. `pages.yml` sets it to the
  ref the site shows.
- Referenced images are copied to `public/`: from `docs/<path>` to `<base>/<path>`, from elsewhere to
  `<base>/_repo/<path>`. A missing image fails the sync.
- Two files with one slug (`user-guide.md` and `user-guide/README.md`) and names starting with `_` fail the sync.

Links in code blocks and inline code stay as written. `starlight-links-validator` fails the build on a link to a
page or an anchor that does not exist.

## Sidebar

`SECTIONS` in [`astro.config.mjs`](astro.config.mjs) lists the groups in order. A group shows its listed pages, then
every page under its folder, so a new file in `docs/<folder>/` joins its group by itself; subfolders become collapsed
groups named after the title of their `README.md`. A group without pages is left out. Inside a folder, pages follow
`sidebar.order` from their front matter or their place in `ORDER`, then the filename. The build log names the pages
in no group.
