#!/usr/bin/env bash
# Usage: tools/ci/chart-check.sh <chart-dir>...
#
# Checks Helm charts: `helm lint --strict`, then the manifests of `helm template` with the default
# values against the Kubernetes JSON schemas (kubeconform). A resource without a schema, such as a
# custom resource, is skipped rather than failed. The charts job of ci.yml runs it on the chart
# sources; publish-artifacts.sh runs it on the staged, pinned copies before it packages them.
#
# Needs helm on PATH. Uses kubeconform from PATH, or downloads kubeconform v0.8.0 into KUBECONFORM_DIR
# (default: RUNNER_TEMP or /tmp) on Linux and macOS and checks it against the checksums below, taken from
# the CHECKSUMS file of that release.
set -euo pipefail

[ "$#" -gt 0 ] || { echo "usage: chart-check.sh <chart-dir>..." >&2; exit 2; }
version=v0.8.0
kubernetes="${KUBERNETES_VERSION:-1.30.0}"
declare -A sha256=(
  [darwin-amd64]=71dbc87ac9f24099a62b93570e65aa06312ba6ac8aea63b7f86e9d999edf5a92
  [darwin-arm64]=f84f4dfbebf4a6b0b230385fa065a39ea35e02608c2b50d025dcf64775a69d67
  [linux-amd64]=9bc2bffbf71f261128533edaf912153948b7ff238f9a531ae6d34466ec287883
  [linux-arm64]=1f53fc8e81258197a35e8603054162a5af1de8c5af13746c71ab680d9534ed87
)

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
    archive="$dir/kubeconform-$os-$arch.tar.gz"
    curl -fsSL --retry 3 -o "$archive" \
      "https://github.com/yannh/kubeconform/releases/download/$version/kubeconform-$os-$arch.tar.gz"
    if command -v sha256sum > /dev/null; then got="$(sha256sum "$archive")"; else got="$(shasum -a 256 "$archive")"; fi
    if [ "${got%% *}" != "${sha256[$os-$arch]}" ]; then
      echo "kubeconform-$os-$arch.tar.gz has checksum ${got%% *}, not ${sha256[$os-$arch]}" >&2
      exit 1
    fi
    tar -xzf "$archive" -C "$dir" kubeconform
  fi
fi

for chart in "$@"; do
  echo "== $chart"
  helm lint --strict "$chart"
  helm template chart-check "$chart" \
    | "$kubeconform" -strict -summary -ignore-missing-schemas -kubernetes-version "$kubernetes" -
done
