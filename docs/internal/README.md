# Internal documentation

This folder holds documents for the people who build APIHUB. It is published on GitHub only, not on the documentation
site.

## What is here

- [Team process](./process.md): work items, workflows, pull request review, and the release cadence of the team.
- [Architecture decision records](./adr/README.md): decisions that shape several modules or the repository.
- [Project history](./history.md): how APIHUB came to be.
- [Monorepo migration record](./monorepo-migration/README.md): the final account of the move from separate
  repositories to this monorepo, with the [plan](./monorepo-migration/plan.md) and the
  [decisions](./monorepo-migration/decisions.md).
- [Autonomous agent](./autonomous-agent/design.md): the design of the AI agent that reviews pull requests and
  implements bugs and tasks in GitHub Actions, with its [implementation plan](./autonomous-agent/plan.md), the
  [spike results](./autonomous-agent/spike.md), and the [handover](./autonomous-agent/handover.md).

## Why it is not on the site

The site is for people who install, run, use, and extend APIHUB. The material here describes how the team works and why
past decisions were made. It would add noise to the site and tie readers to internal practice. Read it on GitHub.
