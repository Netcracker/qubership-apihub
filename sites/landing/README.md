# Qubership APIHUB Landing Page

Static landing site for [Qubership APIHUB](https://github.com/Netcracker/qubership-apihub) — the open source API management platform.

**Stack:** [Astro](https://astro.build/) (static output) + [Tailwind CSS](https://tailwindcss.com/) + [nginx](https://nginx.org/) (production container)

---

## Quick Start

### Local Development

```bash
npm install
npm run dev
# → http://localhost:4321
```

### Build for Production

```bash
npm run build
# Output: ./dist/
```

### Docker (single container)

```bash
# Build and run
docker compose up --build

# Or just run (pulls pre-built image)
docker compose up -d

# Custom port (default: 8090)
PORT=8080 docker compose up -d
```

The site will be available at `http://localhost:8090`.

### Docker: Astro dev server (live reload)

```bash
docker compose --profile dev up dev-server
# → http://localhost:4321
```

---

## Project Structure

```
qubership-apihub-landing/
├── src/
│   ├── data/
│   │   ├── content.ts           ← Site URLs, nav, shared copy (stats, features list, etc.)
│   │   ├── radar.ts             ← Technology radar blips and ring copy
│   │   ├── docs.ts              ← /docs sub-site structure (sidebar, hub cards, prev/next)
│   │   ├── architecture.ts      ← C4 narrative data + typed view of the capability model
│   │   └── capability-model.json ← Copy of the architecture deck's model (see below)
│   ├── layouts/
│   │   ├── Layout.astro         ← Base layout, header, footer, lightbox, global styles
│   │   └── DocsLayout.astro     ← /docs shell: sidebar, breadcrumbs, page ToC, prev/next
│   ├── components/DocFigure.astro ← Captioned, click-to-zoom diagram
│   ├── pages/                   ← One `.astro` file per route (static HTML)
│   │   └── docs/                ← Documentation sub-site
│   │       ├── index.astro      ← Hub: architecture pages + links to the repository guides
│   │       └── architecture/    ← Overview, C4 model, runtime flows, capability map
│   └── content/                 ← Astro content collections (Markdown)
│       ├── config.ts
│       ├── releases/            ← Release notes for /releases
│       └── use-cases/           ← Persona cards for /use-cases
├── public/
│   ├── images/                  ← Static images (favicon, hero, feature screenshots, …)
│   │   └── architecture/        ← Hand-authored dark-theme architecture diagrams (SVG)
│   └── favicon.svg
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

---

## Editing Content

Everything is in the repository — no CMS. Typical locations:

| What | Where |
|------|--------|
| Links, stats, feature carousel data, wiki image URLs | `src/data/content.ts` |
| Page copy and layout | `src/pages/*.astro` |
| "Why APIHUB" business case, positioning, and comparison-by-category data | `src/data/content.ts` (`whyRows`, `whyOutcomes`, `comparisonRows`, …) and `public/images/why/*.svg` |
| Technology radar blips and ring copy | `src/data/radar.ts`, page `src/pages/radar.astro`, preview `public/images/radar/preview.svg` |
| Release timeline | `src/content/releases/*.md` |
| Use-case personas | `src/content/use-cases/*.md` |
| Documentation sidebar, hub cards, page order | `src/data/docs.ts` |
| Architecture narrative (C4 levels, components, flows, deployment, ArchiMate) | `src/data/architecture.ts` |
| Architecture diagrams | `public/images/architecture/*.svg` |
| New static assets | `public/images/` (reference as `/images/...` in pages) |

After changes: `npm run build` (or rebuild the Docker image).

---

## Documentation Sub-Site (`/docs`)

`/docs` is a small documentation sub-site with its own sidebar layout, intended to grow into the home for
user documentation. It currently publishes the platform architecture:

| Page | Contents |
|------|----------|
| [`/docs/`](src/pages/docs/index.astro) | Hub — architecture pages plus links to the installation, user and administrator guides |
| [`/docs/architecture/`](src/pages/docs/architecture/index.astro) | Overview — the two models, the four levels of C4, the container roster |
| [`/docs/architecture/c4/`](src/pages/docs/architecture/c4.astro) | Context, containers, components, code, and the Kubernetes deployment view |
| [`/docs/architecture/flows/`](src/pages/docs/architecture/flows.astro) | Three dynamic views: publishing, runtime discovery, AI access over MCP |
| [`/docs/architecture/capability-map/`](src/pages/docs/architecture/capability-map.astro) | Nine capabilities, sixty sub-capabilities, technology and maturity overlays, ArchiMate layers |

### Refreshing the capability data

`src/data/capability-model.json` is a verbatim copy of `diagrams/arch-deck-2026-09/model.json` in the
APIHUB workspace, which is itself exported from `diagrams/capability-2026-09/model.py`. The capability
map on this site, the slide deck, and the ArchiMate model therefore share one source. To refresh, copy the
JSON over and rebuild — do not hand-edit it:

```bash
cp ../../../diagrams/arch-deck-2026-09/model.json src/data/capability-model.json
npm run build
```

Counts shown on the page (nine capabilities, sixty sub-capabilities, per-container weights, maturity
totals) are derived at build time in `src/data/architecture.ts`, so they update automatically.

### Adding a documentation page

1. Add an entry to the relevant section of `docsNav` in `src/data/docs.ts`.
2. Create the matching page under `src/pages/docs/…` using `DocsLayout`.

The sidebar, the hub card grid, and the previous/next links all read from `docsNav`, so nothing else
needs changing.

> **Astro gotcha:** the compiler hoists frontmatter lines that begin with the `export` keyword. If you
> need `export` as an object key in a component's frontmatter, quote it (`'export': …`).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8090` | Host port mapped to the nginx container |
| `VERSION` | `dev` | Docker label for the image |
| `DEV_PORT` | `4321` | Port for the `dev-server` service (`--profile dev`) |

---

## License

Apache 2.0 — same as Qubership APIHUB.
