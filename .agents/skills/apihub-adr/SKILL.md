---
name: apihub-adr
description: Decide whether a change of the qubership-apihub monorepo needs an architecture decision record, and write it in docs/internal/adr/. Use when a change adopts, replaces, or drops a tool, bot, service, or framework, changes the CI, release, or deployment flow, a published interface, or the repository layout, or reverses an accepted ADR; also when reviewing a pull request that does.
---

# Architecture decision records (qubership-apihub)

An ADR records why the repository works the way it does, for maintainers who were not in the discussion. It is
written with the change that carries the decision out, not afterwards.

## Is an ADR due?

Write one when the change makes a durable decision for several modules or the repository, and a reasonable
maintainer could have chosen differently:

- a tool, bot, service, or framework is adopted, replaced, or dropped (ADR 0010: Renovate replaced Dependabot);
- the CI, release, or deployment flow changes (ADR 0004 `ci-ok`, ADR 0005 release bumps, ADR 0009 the Pages ref);
- a published interface or contract changes shape: a REST API convention, an image or chart layout, a tag scheme;
- the repository layout or the build graph changes (ADR 0002, ADR 0003);
- a non-functional requirement is set: security, availability, data retention;
- an accepted ADR no longer holds.

No ADR for a dependency update, a bug fix, a refactoring inside one module, a feature that follows an existing
pattern, or a documentation edit. If the decision is already recorded, link that ADR instead.

The quick test: alternatives were weighed, or someone will later ask "why is it like this?". When you cannot tell,
ask the user. Do not skip the record silently.

## Write it

Follow `docs/internal/adr/README.md`: its template (the `####` metadata headings and the markdownlint comments),
the next free four-digit number, a row in the index, and links from the pages the decision affects. Generic ADR
guidance that puts records under `docs/adr/` does not apply here.

- **Status.** `Proposed` with no date while the decision waits for the maintainers. When the user says the decision
  is made, or the change that carries it out is already merged, write `Accepted` and that date.
- **Owner.** The GitHub account the user names, usually the author of the change.
- **Justification.** Name each rejected option and the reason, in one or two sentences each. A record without
  alternatives does not explain the decision.
- **Consequences.** What the decision costs, not only what it gains: limits, manual steps, work it leaves for later.
- **Where.** In the pull request of the change, or in a separate pull request opened together with it. Say in the
  description of the change which ADR records it.
- **Changing a decision.** Write a new ADR that supersedes the old one, as the README says. Never rewrite an
  accepted record.
