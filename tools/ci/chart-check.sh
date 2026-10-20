#!/usr/bin/env bash
# Usage: tools/ci/chart-check.sh <chart-dir>...
#
# Checks Helm charts: `helm lint --strict`, then the manifests of `helm template` with the default
# values against the Kubernetes JSON schemas (kubeconform). A resource without a schema, such as a
# custom resource, is skipped rather than failed. The charts job of ci.yml runs it on the chart
# sources; publish-artifacts.sh runs it on the staged, pinned copies before it packages them.
#
# Needs helm on PATH. Uses kubeconform from PATH, or downloads KUBECONFORM_VERSION into
# KUBECONFORM_DIR (default: RUNNER_TEMP or /tmp) on Linux and macOS.
set -euo pipefail

[ "$#" -gt 0 ] || { echo "usage: chart-check.sh <chart-dir>..." >&2; exit 2; }
version="${KUBECONFORM_VERSION:-v0.8.0}"
kubernetes="${KUBERNETES_VERSION:-1.30.0}"

kubeconform="$(command -v kubeconform || true)"
if [ -z "$kubeconform" ]; then
  dir="${KUBECONFORM_DIR:-${RUNNER_TEMP:-/tmp}}/kubeconform-$version"
  kubeconform="$dir/kubeconform"
  if [ ! -x "$kubeconform" ]; then
    os="$(uname -s | tr '[:upper:]' '[:lower:]')"
    case "$(uname -m)" in
      x86_64 | amd64) arch=amd64 ;;
      aarch64 | arm64) arch=arm64 ;;
      *) echo "no kubeconform build for $(uname -m); put kubeconform on PATH" >&2; exit 1 ;;
    esac
    case "$os" in
      linux | darwin) ;;
      *) echo "no kubeconform download for $os; put kubeconform on PATH" >&2; exit 1 ;;
    esac
    mkdir -p "$dir"
    curl -fsSL --retry 3 \
      "https://github.com/yannh/kubeconform/releases/download/$version/kubeconform-$os-$arch.tar.gz" \
      | tar -xz -C "$dir" kubeconform
  fi
fi

for chart in "$@"; do
  echo "== $chart"
  helm lint --strict "$chart"
  helm template chart-check "$chart" \
    | "$kubeconform" -strict -summary -ignore-missing-schemas -kubernetes-version "$kubernetes" -
done
