# Helm charts pinned at package time and published to OCI

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

[0005](./0005-release-flow-with-per-component-bumps.md)

<!-- markdownlint-enable MD001 -->

## Context

The product chart (`deploy/helm-templates/qubership-apihub`) refers to the images of several components, and each
component has its own version ([0005](./0005-release-flow-with-per-component-bumps.md)). Users need a chart whose
image tags are exact, published somewhere they can install from. In Git, the development defaults must keep working
(`dev` image tags) without a commit for every component release.

The agent has its own chart in `backend/agent/helm-templates/qubership-apihub-agent`, versioned with the agent.

## Decision

We will pin images when the chart is packaged, on a staged copy, and publish both charts to the GitHub container
registry as OCI artifacts.

- `release-artifacts` stages the chart (`tools/release/charts.js`), sets `version` and `appVersion` to the release
  version, and replaces each image tag in `values.yaml` with the current version of its component. A missing pin path
  fails the release. Nothing is committed: `Chart.yaml` in Git keeps `0.0.1` and `values.yaml` keeps `dev`.
- The product chart is published as `oci://ghcr.io/netcracker/charts/qubership-apihub:<X.Y.Z>`, the agent chart as
  `oci://ghcr.io/netcracker/charts/qubership-apihub-agent:<version>`. The `.tgz` is attached to the GitHub Release.
- A `charts` job in CI runs `helm lint --strict` and `helm template | kubeconform` on both charts
  (`tools/ci/chart-check.sh`) and is part of `ci-ok`.
- The backend's default image tag in Git is `dev`, like every other image (pull request #881).

### Justification

- Pinning at package time leaves `develop` free of release-only edits.
- Rejected: pinning in `release-finish`. The back-merge would carry the pins into `develop`, and a commit in `deploy/`
  bumps the product at the next release.
- Rejected: a classic Helm repository index on GitHub Pages. OCI covers current Helm clients, and the index would be a
  second place to keep in sync.
- Rejected: moving the agent chart under `deploy/`. It ships with the agent, so it keeps the agent's tag.

## Consequences

- Installing from Git sources gives `dev` images; installing from the registry gives pinned ones.
- Clients without OCI support cannot install the charts directly. Download the `.tgz` from the release.
- The two chart packages in the registry must be made public by an organization admin after the first push.
- Adding an image to the chart means adding its pin path in `tools/release/artifacts.js`.
