#!/usr/bin/env bash
# Prints the image tag that follows a ref, for a git ref such as refs/heads/develop.
#
#   develop        -> dev
#   release        -> next
#   main           -> latest
#   feature/x      -> feature-x
#   refs/pull/N/merge -> pull-N-merge
#
# One definition for images.yml, ci.yml, and the E2E workflows, so the tag that images are
# published under and the tag the E2E stack pulls cannot drift apart.
#
# Usage: branch-tag.sh <ref>
set -euo pipefail

ref="${1:?usage: branch-tag.sh <ref>}"

# Characters outside [A-Za-z0-9_.-] become `-`, and the tag is cut to the 128 characters a tag may have.
# A tag may not start with `.` or `-` either, so those are replaced at the start.
tag="$(printf '%s\n' "$ref" \
  | sed 's@refs/tags/@@;s@refs/heads/@@;s@refs/pull/@pull/@;s@^main$@latest@;s@^develop$@dev@;s@^release$@next@;s@/@-@g;' \
  | tr -c 'A-Za-z0-9_.\n-' '-' \
  | cut -c1-128 \
  | sed 's@^[.-]@_@')"
echo "$tag"
