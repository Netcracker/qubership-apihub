#!/usr/bin/env bash
# Each module's go.mod must state the versions the workspace resolves.
#
# go.work unifies the six modules' dependency graphs, so under the workspace a module can
# build against a higher version than its own go.mod names. Nx and CI build in the
# workspace; the images build one module at a time with GOWORK=off, because a Go builder
# stage copies one module and no go.work. Those two agree only while every go.mod already
# holds the unified versions, which is what `go work sync` writes.
#
# Two checks, in this order, and the order matters:
#
#   1. every module loads on its own under -mod=readonly, the mode every Dockerfile builds
#      in. Run FIRST, on the files as they are: `go work sync` can add go.sum entries, so
#      checking after it would pass a go.sum that is short of an entry in the commit.
#   2. `go work sync` changes nothing. Compared by content hash before and after, not
#      against git, so an uncommitted but already-synced tree passes locally as well.
#
# Run locally, a failure leaves the synced files in the tree. Review and commit them.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$root"

if [[ ! -f go.work ]]; then
  echo "no go.work at the repository root" >&2
  exit 1
fi

# The module directories exactly as go.work spells them, so paths stay relative and
# portable. `go list -m -f '{{.Dir}}'` would give absolute paths in the OS's own form.
mapfile -t mods < <(go work edit -json | sed -n 's/.*"DiskPath": "\(.*\)".*/\1/p' | sed 's#^\./##' | sort)
if [[ ${#mods[@]} -eq 0 ]]; then
  echo "go.work lists no modules — this check would otherwise pass by doing nothing" >&2
  exit 1
fi

status=0
files=()
for mod in "${mods[@]}"; do
  files+=("$mod/go.mod")
  [[ -f "$mod/go.sum" ]] && files+=("$mod/go.sum")
done

for mod in "${mods[@]}"; do
  # `-e` so every broken package is reported, not only the first. The template prints only
  # packages that failed to load, to STDOUT, so any stdout at all is a failure.
  #
  # stderr is kept apart, and that is the whole of a defect the first CI run found. On a cold
  # module cache Go reports every module it fetches on stderr, `go: downloading ...`. The
  # first version merged the two streams, so on a runner, where the cache starts empty, four
  # modules reported BROKEN with nothing but download lines, while every local run, on a warm
  # cache, passed. A non-zero exit is still a failure, reported with stderr minus downloads.
  stderr_file="$(mktemp)"
  set +e
  errors="$(cd "$mod" && GOWORK=off GOFLAGS=-mod=readonly \
    go list -e -deps -test -f '{{if .Error}}{{.ImportPath}}: {{.Error}}{{end}}' ./... 2>"$stderr_file")"
  rc=$?
  set -e
  if [[ $rc -ne 0 ]]; then
    errors="${errors}"$'\n'"go list exited $rc: $(grep -v '^go: downloading ' "$stderr_file" | head -5)"
  fi
  rm -f "$stderr_file"
  errors="$(printf '%s' "$errors" | grep . || true)"
  if [[ -n "$errors" ]]; then
    echo "  BROKEN $mod does not load on its own under -mod=readonly:" >&2
    printf '%s\n' "$errors" | head -5 | sed 's/^/           /' >&2
    status=1
  else
    echo "  ok     $mod loads on its own"
  fi
done

before="$(sha256sum "${files[@]}")"
go work sync
after="$(sha256sum "${files[@]}")"
if [[ "$before" != "$after" ]]; then
  echo "  DRIFT  go work sync changed these, so they do not state what the workspace resolves:" >&2
  # sha256sum separates hash and name with two spaces, or with " *" where it reads in binary
  # mode, which is the Windows default.
  diff <(printf '%s\n' "$before") <(printf '%s\n' "$after") | sed -n 's/^> [0-9a-f]* [ *]/           /p' >&2
  status=1
else
  echo "  ok     go work sync changes nothing (${#files[@]} files)"
fi

[[ $status -eq 0 ]] && echo "every module states the workspace's versions and loads on its own (${#mods[@]} modules)"
exit $status
