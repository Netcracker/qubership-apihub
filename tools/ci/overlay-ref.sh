#!/usr/bin/env bash
# Replaces paths of the working tree with their content at another ref of this repository.
#
# The E2E workflows run from the commit that started them. The launch contract lets a person take
# `deploy/` and the agent chart, the Postman collections, or the Playwright suite from another branch,
# tag, or commit (deploy-ref, postman-ref, playwright-ref). An empty ref leaves the paths alone.
#
# Run it before the workspace install: a changed tests/ui-tests/package.json then has to agree with
# the lockfile, and `pnpm install --frozen-lockfile` says so when it does not.
#
# Usage: overlay-ref.sh <ref-or-empty> <path>...
set -euo pipefail

ref="${1:-}"
shift || true

if [[ -z "$ref" ]]; then
  echo "no ref given: $* stay at $(git rev-parse --short HEAD)"
  exit 0
fi
if [[ $# -eq 0 ]]; then
  echo "no paths given for ref $ref" >&2
  exit 1
fi

# A ref that starts with `-` would be read as an option by `git fetch`.
if [[ "$ref" == -* ]]; then
  echo "::error::ref '$ref' must not start with '-'" >&2
  exit 1
fi

# A branch, a tag, or a full commit id; the remote resolves it.
git fetch --no-tags --depth=1 origin "$ref"
sha="$(git rev-parse FETCH_HEAD)"

for path in "$@"; do
  if ! git cat-file -e "$sha:$path" 2>/dev/null; then
    echo "::error::$path does not exist at $ref ($sha)" >&2
    exit 1
  fi
done

# restore, not checkout: files that exist here but not at the ref are removed.
git restore --source="$sha" --worktree -- "$@"
echo "$* now at $ref ($sha)"
