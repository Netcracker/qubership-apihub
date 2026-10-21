# Developer guide

Guides for people who change APIHUB: setting up a workstation, building and testing the modules, running the product
locally, debugging, opening a pull request, CI, and releases. Each module has its own `README.md` for what is specific
to it; these pages cover what all modules share.

## Where to start

New to the repository? Read the first five pages in order. Together they take you from a clean machine to a merged
pull request.

1. [Getting started](./getting-started.md): the tools and their versions, Git settings, the clone, the first install,
   build, and test, and the Windows notes.
2. [Development workflow](./workflow.md): issues, branch names, Conventional Commit titles, pull requests, review and
   merge, features that need frontend and backend changes, and Dependabot pull requests.
3. [Build and test](./build-and-test.md): Nx, and how to build and test the TypeScript, Go, and Java modules, the
   images, the Storybooks and screenshot tests, and the E2E suites.
4. [Local run](./local-run.md): the product in Docker Compose or a local Kubernetes cluster, with released or locally
   built images, and one service from your IDE against the rest.
5. [Debugging](./debugging.md): a debugger on a Go service, a TypeScript library, the UI, the builder, a Java worker,
   Storybook, Playwright, and a Newman collection.

Then, when you need them:

- [CI](./ci.md): the workflows and their triggers, the required `ci-ok` check, image tags, E2E tiers, the manual E2E
  run, and how to read a red run.
- [Release process](./release-process.md): cutting a product release, hotfixes, version rules, release notes, the
  Helm charts, and the GitHub Pages site. Release managers read all of it; everyone else reads
  [Version rules](./release-process.md#version-rules) to see what a pull request title does.
- [API guidelines](./api-guidelines.md): designing, changing, deprecating, and reviewing the REST APIs.
- [Documentation](./documentation.md): where each kind of document lives, the documentation site, and the linters.
- [AI assistants](./ai-assistants.md): the agent packages, `apm install`, and the `AGENTS.md` files.

## By role

| You are | Read |
|---|---|
| a frontend developer | getting started, workflow, build and test (TypeScript, Storybooks, screenshot tests), local run (UI proxy mode) |
| a backend developer | getting started, workflow, build and test (Go or Java), local run (one service from the IDE), debugging |
| a test automation engineer | getting started, workflow, build and test (Newman and Playwright), CI (E2E tiers, manual E2E) |
| a release manager | release process, CI |
| a reviewer | workflow (titles, checks, merge), CI (reading a red run) |

## Related pages

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md): the Contributor License Agreement and the code of conduct.
- [Configuration reference](../configuration-reference.md): every configuration file, environment variable, and Helm
  value. Update it in the same pull request as a configuration change.
- [Team process](../internal/process.md): work item types and their fields, statuses, and sprints. It is not published
  on the documentation site.
- [`AGENTS.md`](../../AGENTS.md): instructions for AI coding assistants that work in this repository.
