#!/usr/bin/env bash
# Lists the Postman collections an E2E run executes, one `<name> <file>` pair per line.
#
# The list is the `postman-collections` input of the launch contract: comma-separated entries, each
# either a path relative to tests/postman-collections (`./e2e/1_1_Smoke_Portal.postman_collection.json`,
# as the old workflows took it) or a bare collection name of the e2e folder (`1_1_Smoke_Portal`).
# An empty list means the default of the runtime:
#
#   compose  the Portal collections
#   kind     the same plus 1_2_Smoke_Agent, which needs the agent (left out when the agent is off)
#
# The `smoke` tier runs 1_1_Smoke_Portal alone and ignores the list.
#
# Every file must exist; a typo fails here, not as a missing report at the end of the run.
#
# Usage: e2e-collections.sh <runtime: kind|compose> <list-or-empty> <tier: full|smoke> <agent: true|false>
set -euo pipefail

runtime="${1:?usage: e2e-collections.sh <kind|compose> <list> <tier> <agent>}"
list="${2:-}"
tier="${3:-full}"
agent="${4:-true}"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
base="tests/postman-collections"

portal='1_1_Smoke_Portal 1_3_Linter_Portal 2_1_Negative_Portal 3_1_Stories_Bugs 3_2_Stories_Bugs 4_Access_control'

entries=()
if [[ "$tier" == 'smoke' ]]; then
  entries=(1_1_Smoke_Portal)
elif [[ -n "${list//[[:space:],]/}" ]]; then
  IFS=',' read -r -a raw <<< "$list"
  for item in "${raw[@]}"; do
    item="$(echo "$item" | xargs)"
    [[ -n "$item" ]] && entries+=("$item")
  done
else
  case "$runtime" in
    kind)
      entries=(1_1_Smoke_Portal)
      [[ "$agent" == 'true' ]] && entries+=(1_2_Smoke_Agent)
      read -r -a rest <<< "${portal#1_1_Smoke_Portal }"
      entries+=("${rest[@]}")
      ;;
    compose) read -r -a entries <<< "$portal" ;;
    *) echo "unknown runtime: $runtime" >&2; exit 1 ;;
  esac
fi

[[ ${#entries[@]} -gt 0 ]] || { echo "no collections selected" >&2; exit 1; }

for item in "${entries[@]}"; do
  if [[ "$item" == */* ]]; then
    file="$base/${item#./}"
  else
    file="$base/e2e/${item%.postman_collection.json}.postman_collection.json"
  fi
  if [[ ! -f "$root/$file" ]]; then
    echo "collection not found: $item (looked for $file)" >&2
    exit 1
  fi
  name="$(basename "$file" .postman_collection.json)"
  echo "$name $file"
done
