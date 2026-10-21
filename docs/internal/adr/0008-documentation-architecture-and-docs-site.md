# Documentation architecture and the docs site

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

[0001](./0001-one-repository-for-every-component.md), [0007](./0007-pages-layout-and-the-storybook-and-erd-stores.md)

<!-- markdownlint-enable MD001 -->

## Context

Before the move, the documentation lived in three wikis (89, 29, and 3 pages), in the umbrella's `docs/`, and in the
README and `docs/` folder of each repository. One topic, such as the architecture, existed in five places. About a
hundred wiki images sat on `github.com/user-attachments`, outside Git. Wiki pages had no review and no link to code
changes, and polyrepo-specific text (releases, repository lists) was wrong after the merge.

## Decision

We will keep all documentation in the repository, one home per fact, and publish the product part as a site
(pull request #884).

- Levels and placement rules are in [the documentation guide](../../development/documentation.md): the repository
  README, `docs/` (product), `docs/internal/` (team), group READMEs, module READMEs and `docs/`, and agent files.
  The reader decides the place.
- `docs/` is the source. The wikis' content moved into it by topic (user guide, reference, administration,
  architecture, design items, development). The wikis stay enabled, but their Home pages only link to the sites.
- `sites/docs`, an Astro Starlight site, publishes `docs/` at `/docs/`. `scripts/sync-docs.mjs` takes titles from the
  first H1, rewrites links between pages, turns links to files outside `docs/` into GitHub links, and copies images.
  A link validator fails the build on a broken link or anchor.
- `docs/internal/` (ADRs, project history, team process) is in Git and not on the site.
- Every image lives in the repository, in `docs/images/` or `<module>/docs/images/`. The architecture diagrams have
  one copy in `docs/images/architecture/`.
- Docs change in the same pull request as the code. Markdown is wrapped at 120 characters by convention, and CI
  enforces 400 with markdownlint, textlint terminology, and lychee.
- Finished plans move to `<module>/docs/archive/`. Agent files (`AGENTS.md`, `agent-packages/`) are not documentation
  for people, and human documents do not depend on them.

### Justification

- Pull requests review docs together with code, and GitHub renders every page, so the site is only a view.
- Starlight reads Markdown from the repository and brings navigation, search, and link validation.
- Rejected: keeping the wikis as the source. They have no review, no history linked to code, and no CI.
- Rejected: hot-linking `user-attachments` images. They are not under repository control and can disappear.

## Consequences

- Contributors must update the page, the index, and the design numbering in the same pull request.
- Names under `docs/` are lowercase kebab-case, because they become URLs. Existing module file names are kept.
- The site and the repository can differ only in link form, never in content.
- A change to placement rules needs a new ADR that supersedes this one.
