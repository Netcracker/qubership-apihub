# Navigation page of the Pages site

This folder holds the entry page of the Qubership APIHUB Pages site, served at `/qubership-apihub/`. It is plain
static HTML and CSS. There is no build, no framework, and no package manifest, so it cannot break a deploy.

## Files

- `index.html`: the navigation page with five cards (Landing, Documentation, Storybooks, Database ERD,
  Open Pull Requests Cockpit) and a footer. The last card links to the external report of the `qubership-apihub-ci`
  site.
- `404.html`: the root 404 page. GitHub Pages serves only this one, at any depth, so its links are absolute paths
  under `/qubership-apihub/`.
- `style.css`: the dark theme of the landing in plain CSS. The generated ERD index page (`/erd/index.html`) links it
  too and uses `main.page`, `section.cards`, and `a.card` with `h2` and `p`.
- `logo.png`: a copy of `sites/landing/public/logo.png`.

## Placeholders

The Pages assembly (`tools/ci/pages-site.js`) copies the files to the site root and replaces these HTML comments:

| Placeholder | File | Replaced with |
|-------------|------|---------------|
| `<!--@STORYBOOK_COMPONENTS@-->` | `index.html` | a `<ul>` of links to the Storybook components |
| `<!--@ERD_BACKENDS@-->` | `index.html` | a `<ul>` of links to the ERD of each backend |
| `<!--@BUILD_REF@-->` | `index.html` | the ref the site was built from |
| `<!--@STORYBOOK_404_TEXT@-->` | `404.html` | the "branch not published" text for Storybook paths |

`404.html` also loads `/qubership-apihub/404-map.js`, which the assembly writes. The script reads `location.pathname`,
then redirects legacy URLs or fills the element `#message`. For Storybook paths it also shows `#storybook-404-text`.
Without the script, the page shows a "not found" text and links to the four sites.

## Preview

Serve the parent folder and open `/index/index.html`:

```bash
npx -y http-server sites -p 8090
```

The 404 page uses absolute `/qubership-apihub/` paths, so its styles load only when the site is served under that
prefix.
