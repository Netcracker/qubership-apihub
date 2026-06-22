#!/usr/bin/env bash
# Verifies each SQL migration numeric prefix maps to at most one migration name.
# Paired .up.sql / .down.sql for the same migration share one number (expected).
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../" && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/qubership-apihub-service/resources/migrations"

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
    echo "error: migrations directory not found: ${MIGRATIONS_DIR}" >&2
    exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
max_num=0

shopt -s nullglob
for f in "${MIGRATIONS_DIR}"/*; do
    base="$(basename "$f")"
    if [[ ! "$base" =~ ^([0-9]+)_(.+)\.(up|down)\.sql$ ]]; then
        continue
    fi
    num="${BASH_REMATCH[1]}"
    slug="${BASH_REMATCH[2]}"
    num_int=$((10#$num))
    if ((num_int > max_num)); then
        max_num=$num_int
    fi
    printf '%s\t%s\n' "$num" "$slug" >>"$tmp"
done

duplicates="$(
    sort -u "$tmp" | awk -F'\t' '{
        if ($1 in seen && seen[$1] != $2) {
            dup[$1] = seen[$1] " and " $2
        } else {
            seen[$1] = $2
        }
    }
    END {
        for (n in dup) print n ": " dup[n]
    }'
)"

count="$(sort -u "$tmp" | awk -F'\t' '{ seen[$1]=1 } END { print length(seen) }')"

if [[ -n "$duplicates" ]]; then
    echo "error: migration number used for multiple distinct migrations:" >&2
    echo "$duplicates" | while read -r line; do
        echo "  - $line" >&2
    done
    exit 1
fi

echo "ok: ${count} migration number(s), highest prefix is ${max_num}"
echo "next suggested prefix: $((max_num + 1))"
exit 0
