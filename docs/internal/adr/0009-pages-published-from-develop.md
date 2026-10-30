# Pages published from develop

## Status

Accepted

<!-- markdownlint-disable MD001 -->

#### Date

2026-10-30

#### Owner

@alagishev

#### Participants and approvers

APIHUB maintainers (@alagishev)

#### Related ADRs

[0007](./0007-pages-layout-and-the-storybook-and-erd-stores.md). This record supersedes the ref rule in that
decision. The layout, Storybook store, and ERD store of 0007 stay accepted.

<!-- markdownlint-enable MD001 -->

## Context

ADR 0007 publishes every Pages section except the Storybooks from `main`, once `main` has
`sites/landing/package.json`. Before the first product release from the monorepo the same sections came from
`develop`, because `main` did not yet hold the site. Product release 2.16.0 put that tree on `main`, so the next
Pages run would have switched. `main` is the released snapshot. The landing card, the docs, and the other site
content land on `develop` first, and a commit on `main` outside the release flow breaks the next release.

## Decision

We will publish every Pages section except the Storybooks from `develop`.

The repository variable `SITE_REF`, when set, overrides that ref for the whole site. `LANDING_REF`, when set,
overrides the landing only. Leave both unset for the normal site.

Storybooks stay per branch, as in ADR 0007. `erd.yml` still renders on `develop` and on `main`.

### Justification

- `develop` is the default branch and the branch where the site content is reviewed. Publishing it shows the
  landing card and the docs as soon as they merge, including a card added after a release.
- Rejected: switch to `main` after the first monorepo release, which is the rule in ADR 0007. The published site
  would lag `develop` until the next release, and a docs fix would need a release to appear.
- Rejected: drop `SITE_REF` and `LANDING_REF`. An explicit pin is still the way to publish one other ref without
  changing this rule.

## Consequences

- This supersedes the ref rule of ADR 0007, the rule that the site shows `main` once it has the landing. The URL
  layout, the Storybook store, and the ERD store stay as decided in that record, which stays Accepted.
- No repository variable has to be set. `PAGES_DEPLOY` stays the switch that allows the deploy. A set `SITE_REF` or
  `LANDING_REF` still wins over `develop`, so those variables stay empty.
- A landing release card merged to `develop` is what the public landing shows. It is not committed to `main` outside
  a release. See the release process, "You forgot the landing release card".
- An ERD rendered only on `main` appears on the site when that tree is on `develop`.
