# Decisions and assumptions

Decisions are numbered D1 to D20 and assumptions A1 to A9, as in the plan that guided the work. D1 to D10 and A1 to A9
were agreed on or before 2026-10-18, before the import push. Later decisions carry their date. The durable ones are
also written up as [architecture decision records](../adr/README.md).

## Decisions

| ID | Date | Decision |
|---|---|---|
| D1 | 2026-10-18 | The umbrella's `helm-templates/` and `docker-compose/` move to `deploy/`. `docs/` stays at the root. |
| D2 | 2026-10-18 | Folders and tag prefixes use short names: `backend/portal-backend`, tag `portal-backend/1.21.0` ([ADR 0002](../adr/0002-layout-and-tag-prefixes.md)). |
| D3 | 2026-10-18 | A bare `#123` in imported commit messages and release bodies becomes `Netcracker/<repo>#123`, so it does not link to the wrong issue. Old issues get cross-reference events. |
| D4 | 2026-10-18 | The linter's historic `spectral` and `vacuum` binaries (up to 90 MiB) are stripped from its history. |
| D5 | 2026-10-18 | At T0 the open issues of the old repositories move to `qubership-apihub`. Nothing else happens to the old repositories: no pull request porting, banners, or `gh-pages` redirects. The owners archive them by hand. Amended 2026-10-20: the UI and compatibility-suites wikis are merged into `docs/` with the main wiki, placed by topic (see D13). |
| D6 | 2026-10-18 | The documentation site uses Astro Starlight. |
| D7 | 2026-10-18 | `https://netcracker.github.io/apihub/` redirects to the new landing, through a pull request to `Netcracker/netcracker.github.io`. |
| D8 | 2026-10-18 | No sandbox rehearsals. The work happens in `Netcracker/qubership-apihub`. |
| D9 | 2026-10-18 | Big bang: freeze the old repositories, import straight into `develop` and `main`, and finish the wiring there. |
| D10 | 2026-10-18 | The AI assistant for pull requests (step 12) is out of scope. |
| D11 | 2026-10-18 | Amends D9. The wiring reaches `develop` as a stack of pull requests, each into the previous branch, merged top-down with merge commits allowed once. `ci-ok` is required before the bottom pull request merges. |
| D12 | 2026-10-19 | Nx 23 counts a dependency's commits as the dependent's own. The release flow computes each component's bump from its own directory and feeds it to Nx as version plans. Dependents get a patch bump ([ADR 0005](../adr/0005-release-flow-with-per-component-bumps.md)). |
| D13 | 2026-10-20 | No wiki is disabled. In the main wiki only Home and the sidebar change, and both link to stable entry points of the Pages site. The UI and compatibility-suites wikis are not edited. |
| D14 | 2026-10-20 | Wiki and landing histories are not imported. Their content arrives in plain commits that name the source. |
| D15 | 2026-10-20 | Pages layout: a navigation page at `/qubership-apihub/`, the landing at `/landing/`, the docs at `/docs/`, the Storybooks at `/storybook/`, and the ERDs at `/erd/`. |
| D16 | 2026-10-20 | Everything on Pages except the Storybooks shows `main`. Before the first product release from the monorepo it shows `develop`. `SITE_REF` and `LANDING_REF` override it. Revised 2026-10-30 by D20: the site stays on `develop`. |
| D17 | 2026-10-20 | Each backend with a database gets an ERD rendered in CI from its migrations, only when the migrations tree is new. The committed ERD leaves Git. |
| D18 | 2026-10-20 | `docs/internal/` (ADRs, project history, team process, this record) stays in the repository and is not published on the docs site. |
| D19 | 2026-10-20 | Every image hosted on `github.com/user-attachments` is copied into the repository. |
| D20 | 2026-10-30 | Pages, except the Storybooks, are published from `develop`. `SITE_REF` and `LANDING_REF` still override that ref ([ADR 0009](../adr/0009-pages-published-from-develop.md)). |

## Assumptions

| ID | Date | Assumption |
|---|---|---|
| A1 | 2026-10-18 | The default branch becomes `develop`, as in every component repository. `main` holds released states only. |
| A2 | 2026-10-18 | Image names (`ghcr.io/netcracker/qubership-apihub-*`) and npm package names (`@netcracker/qubership-apihub-*`) do not change. |
| A3 | 2026-10-18 | The umbrella history is not rewritten. Module histories are rewritten and merged in. No force push. |
| A4 | 2026-10-18 | The import is a script that gives identical SHAs on every run with the same inputs. Every run is verified locally before it is pushed. |
| A5 | 2026-10-18 | Go module paths become `github.com/Netcracker/qubership-apihub/backend/<name>`. Services use `replace` to reach `commons-go`, so no Go module tags are needed for now. |
| A6 | 2026-10-18 | The monorepo CI is self-contained and does not call the reusable workflows of `qubership-apihub-ci` ([ADR 0004](../adr/0004-self-contained-ci-with-ci-ok.md)). |
| A7 | 2026-10-18 | Tag prefixes of imported tags equal the component directory name. Step R confirmed which Nx project carries each version. |
| A8 | 2026-10-18 | Product tags stay bare semver and continue from `2.15.0`. Existing product releases are untouched. |
| A9 | 2026-10-18 | T0 comes right after a product release, so the next sprint has time for the release steps. |
