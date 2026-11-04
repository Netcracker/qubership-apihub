#!/usr/bin/env bash
# Checks SQL migration file names against the rules the service enforces at startup.
#
# Errors (exit 1, all reported at once):
#   1. two up files or two down files share a number, including padded variants such as 1_ and 01_;
#   2. one number is used by migrations with different names;
#   3. a down file has no up file with the same number;
#   4. up numbers are not exactly 1..N, a prefix is 0 or longer than 9 digits, or no migration files exist.
# Warnings (exit 0 if there are no errors):
#   5. an up file has no down file; allowed for data fixes that cannot be reverted.
set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../../" && pwd)"
MIGRATIONS_DIR="${REPO_ROOT}/resources/migrations"

# Keeps numbers inside 32-bit integers on both the bash and PowerShell side.
MAX_PREFIX_DIGITS=9

if [[ ! -d "${MIGRATIONS_DIR}" ]]; then
    echo "error: migrations directory not found: ${MIGRATIONS_DIR}" >&2
    exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
errors=""
file_count=0

shopt -s nullglob
for f in "${MIGRATIONS_DIR}"/*; do
    base="$(basename "$f")"
    if [[ ! "$base" =~ ^([0-9]+)_(.+)\.(up|down)\.sql$ ]]; then
        continue
    fi
    raw="${BASH_REMATCH[1]}"
    slug="${BASH_REMATCH[2]}"
    side="${BASH_REMATCH[3]}"
    file_count=$((file_count + 1))
    if ((${#raw} > MAX_PREFIX_DIGITS)); then
        errors="${errors}${base}: prefix is longer than ${MAX_PREFIX_DIGITS} digits"$'\n'
        continue
    fi
    num=$((10#$raw))
    if ((num == 0)); then
        errors="${errors}${base}: migration number must start at 1"$'\n'
        continue
    fi
    printf '%s\t%s\t%s\t%s\n' "$side" "$num" "$slug" "$base" >>"$tmp"
done

if ((file_count == 0)); then
    errors="${errors}no migration files found in ${MIGRATIONS_DIR}"$'\n'
fi

# Each output line is "E<TAB>message", "W<TAB>message" or "S<TAB>count<TAB>highest".
report="$(
    LC_ALL=C sort -t "$(printf '\t')" -k2,2n -k1,1 -k4,4 "$tmp" | awk -F'\t' '
    {
        side = $1; num = $2 + 0; slug = $3; base = $4
        key = side SUBSEP num
        if (key in side_files) {
            side_files[key] = side_files[key] ", " base
            side_dup[key] = 1
        } else {
            side_files[key] = base
            side_order[++side_n] = key
        }
        if (!(num in slugs)) {
            num_order[++num_n] = num
            slugs[num] = slug
            seen_slug[num SUBSEP slug] = 1
        } else if (!((num SUBSEP slug) in seen_slug)) {
            seen_slug[num SUBSEP slug] = 1
            slugs[num] = slugs[num] SUBSEP slug
            distinct[num] = 1
        }
        if (side == "up") {
            if (!(num in ups)) { up_count++; if (num > max_up) max_up = num }
            ups[num] = 1
            up_files[++up_n] = base
            up_num[up_n] = num
        } else {
            downs[num] = 1
        }
    }
    END {
        for (i = 1; i <= num_n; i++) {
            n = num_order[i]
            if (n in distinct) {
                cnt = split(slugs[n], names, SUBSEP)
                s = names[1]
                for (j = 2; j <= cnt; j++) s = s " and " names[j]
                print "E\t" n ": migration number used for distinct migrations " s
            }
        }
        for (i = 1; i <= side_n; i++) {
            k = side_order[i]
            split(k, parts, SUBSEP)
            if ((k in side_dup) && !(parts[2] in distinct)) {
                print "E\t" parts[2] ": duplicate " parts[1] " migration number: " side_files[k]
            }
        }
        for (i = 1; i <= num_n; i++) {
            n = num_order[i]
            if ((n in downs) && !(n in ups) && !(n in distinct)) {
                print "E\t" n ": down migration has no up migration with the same number"
            }
        }
        if (up_count > 0 && max_up != up_count) {
            missing = ""; shown = 0
            for (n = 1; n <= max_up && shown < 20; n++) {
                if (!(n in ups)) { missing = missing (shown ? ", " : "") n; shown++ }
            }
            if (shown == 20) missing = missing ", ..."
            print "E\tmissing migration number(s): " missing " (highest number found is " max_up ")"
        }
        missing_down = 0
        for (i = 1; i <= up_n; i++) {
            n = up_num[i]
            if (!(n in downs) && !(n in distinct)) {
                print "W\twarning: no down migration for " up_files[i]
                missing_down++
            }
        }
        if (missing_down > 0) {
            print "W\twarning: " missing_down " up migration(s) have no down migration (allowed for data fixes; confirm it is intentional)"
        }
        print "S\t" up_count + 0 "\t" max_up + 0
    }'
)"

count=0
highest=0
while IFS="$(printf '\t')" read -r kind a b; do
    case "$kind" in
        E) errors="${errors}${a}"$'\n' ;;
        W) echo "$a" >&2 ;;
        S) count="$a"; highest="$b" ;;
    esac
done < <(printf '%s\n' "$report")

if [[ -n "$errors" ]]; then
    echo "error: migration files violate the startup checks:" >&2
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            echo "  - $line" >&2
        fi
    done < <(printf '%s' "$errors")
    exit 1
fi

echo "ok: ${count} migration number(s), highest prefix is ${highest}"
echo "next suggested prefix: $((highest + 1))"
exit 0
