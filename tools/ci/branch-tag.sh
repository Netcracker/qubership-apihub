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

echo "$ref" | sed 's@refs/tags/@@;s@refs/heads/@@;s@refs/pull/@pull/@;s@^main$@latest@;s@^develop$@dev@;s@^release$@next@;s@/@-@g;'
