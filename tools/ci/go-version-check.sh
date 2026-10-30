#!/usr/bin/env bash
# One Go version for the workspace. backend/.go-version is the source of truth, the
# way `packageManager` is for pnpm, and this fails when anything drifts from it.
#
# Why this cannot be left to the build: GOTOOLCHAIN defaults to `auto`, so a toolchain
# older than a module's `go` directive DOWNLOADS a newer one instead of failing. A
# drifted directive therefore builds green. The directive is the thing to check, not
# the build result.
#
# `actions/setup-go` reads backend/.go-version directly via `go-version-file`, so CI
# installs what this file says rather than a string repeated in the workflow.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
expected="$(tr -d '[:space:]' < "$root/backend/.go-version")"
status=0

if [[ -z "$expected" ]]; then
  echo "backend/.go-version is empty" >&2
  exit 1
fi
echo "expected Go version: $expected"

# go.work carries a `go` directive too, and in workspace mode it is the one the toolchain
# honours, so it drifts exactly as a module's does.
mapfile -t mods < <({ find "$root/backend" -name go.mod -not -path '*/vendor/*'; [[ -f "$root/go.work" ]] && echo "$root/go.work"; } | sort)
if [[ ${#mods[@]} -eq 0 ]]; then
  echo "no go.mod found under backend/ — this check would otherwise pass by doing nothing" >&2
  exit 1
fi

for mod in "${mods[@]}"; do
  rel="${mod#"$root/"}"
  directive="$(awk '/^go [0-9]/ { print $2; exit }' "$mod")"
  if [[ "$directive" != "$expected" ]]; then
    echo "  DRIFT  $rel declares go ${directive:-<none>}" >&2
    status=1
  else
    echo "  ok     $rel"
  fi
  if grep -q '^toolchain ' "$mod"; then
    echo "  DRIFT  $rel declares a toolchain directive, which overrides the go directive" >&2
    status=1
  fi
done

mapfile -t dockerfiles < <(find "$root/backend" -name Dockerfile | sort)
for df in "${dockerfiles[@]}"; do
  rel="${df#"$root/"}"
  while read -r tag; do
    [[ -z "$tag" ]] && continue
    if [[ "$tag" != "$expected" ]]; then
      echo "  DRIFT  $rel builds on golang:$tag" >&2
      status=1
    else
      echo "  ok     $rel golang:$tag"
    fi
  done < <(grep -oE 'golang:[0-9]+\.[0-9]+(\.[0-9]+)?' "$df" | cut -d: -f2)
done

[[ $status -eq 0 ]] && echo "every Go module and builder image is on $expected"
exit $status
