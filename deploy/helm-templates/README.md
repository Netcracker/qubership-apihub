# Qubership APIHUB Helm Charts

This folder contains the `qubership-apihub` Helm chart for deploying Qubership APIHUB to a Kubernetes cluster. The
chart is ready for use. See the [installation guide](../../docs/installation-guide.md) and the
[configuration reference](../../docs/configuration-reference.md), which shows which values become environment
variables and which become `config.yaml` keys.

The APIHUB Agent has its own chart in
[`backend/agent/helm-templates`](../../backend/agent/helm-templates/README.md).

## Dev cases

The `local-k8s-quickstart` folder contains scripts, guides, and third-party charts that set up a lightweight Kubernetes
cluster on your PC with APIHUB and its dependencies (PostgreSQL) in a single command. It is meant for APIHUB developers
and R&D work, not for production. See the [quickstart guide](./local-k8s-quickstart/README.md) and, for testing your own
images, the [local run guide](../../docs/development/local-run.md#kind-quickstart).
