# GitHub Pages layout, and the Storybook and ERD stores

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev, @viacheslav-lunev, @karpov-aleksandr)

#### Related ADRs

[0004](./0004-self-contained-ci-with-ci-ok.md), [0008](./0008-documentation-architecture-and-docs-site.md)

<!-- markdownlint-enable MD001 -->

## Context

Pages of the old repository was a legacy build of `docs/`: no index, raw Markdown guides, and an ERD committed by hand
that was months old. Six components published Storybooks from `gh-pages`, and the landing lived in another
organization repository. The product now needs one deployment that serves a navigation page, the landing, the docs,
the Storybooks of live branches, and the database diagrams, without breaking URLs that people already use.

## Decision

We will deploy one Pages site from `pages.yml` (pull request #883) under
`https://netcracker.github.io/qubership-apihub/`:

| Path | Content |
|---|---|
| `/` | navigation page (`sites/index/`) |
| `/landing/` | product landing (`sites/landing`) |
| `/docs/` | documentation site (`sites/docs`) |
| `/storybook/<component>/<branch>/` | Storybooks, with an index of every published branch |
| `/erd/<backend>/` | database diagrams, one per backend that owns a database |

- Everything except the Storybooks shows `main`. Until `main` has `sites/landing/package.json` (before the first
  product release from the monorepo), it shows `develop`. The repository variables `SITE_REF` and `LANDING_REF`
  override the ref.
- Storybooks are stored as OCI artifacts in the registry and assembled into the site. They get the rest of a 900 MiB
  budget after the other sites; the build fails when the other sites exceed 300 MiB.
- ERDs are rendered in CI by `erd.yml`: it applies the SQL migrations to an empty PostgreSQL 16 service, runs
  SchemaSpy, and stores the result as `ghcr.io/netcracker/erd-<backend>:mig-<key>`, where the key hashes the tree of
  `resources/migrations/` and the tool versions. A render happens only when that key is new. The committed ERD left Git.
- Legacy URLs redirect from the root `404.html`: `/pages/erd/*` to `/erd/portal-backend/*`, and
  `/<guide>.md` to the docs page. The old landing address `/apihub/*` redirects to `/landing/*` through a pull request
  to the organization Pages repository.
- The Pages source is GitHub Actions.

### Justification

- The migrations are the only source of the schema, so an empty database gives the same tables as a running service
  without images or secrets. Rendering by key keeps CI cheap.
- One ref for everything except Storybooks avoids a site that mixes versions.
- Rejected: per-branch landing, docs, and ERDs. Only Storybooks help reviewers see a branch.
- Rejected: an ERD from an end-to-end environment. It needs the whole stack for one diagram.

## Consequences

- `pages.yml` can only be dispatched once it is on the default branch.
- A new backend with migrations joins `/erd/` by convention.
- The Storybook budget can drop old branches from the site when the size grows.
- Linked URLs from the wikis and the old landing rely on the redirect script in `404.html`.
