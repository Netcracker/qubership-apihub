package utils

import (
	"sort"
	"strings"
)

// CompressVisibleRoots returns the minimal set of readable package ids such that every
// readable package is equal to a root or lies in its subtree, and no root is under another.
func CompressVisibleRoots(readableIds []string) []string {
	if len(readableIds) == 0 {
		return []string{}
	}
	ids := uniqueSorted(readableIds)
	roots := make([]string, 0, len(ids))
	for _, id := range ids {
		if !hasReadableAncestor(id, ids) {
			roots = append(roots, id)
		}
	}
	return roots
}

func hasReadableAncestor(id string, readableSorted []string) bool {
	for _, r := range readableSorted {
		if r == id {
			continue
		}
		if isStrictDescendant(id, r) {
			return true
		}
	}
	return false
}

func isStrictDescendant(id, ancestor string) bool {
	if ancestor == "" || id == ancestor {
		return false
	}
	return strings.HasPrefix(id, ancestor+".")
}

func uniqueSorted(ids []string) []string {
	set := toSet(ids)
	out := make([]string, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Strings(out)
	return out
}

func toSet(ids []string) map[string]bool {
	set := make(map[string]bool, len(ids))
	for _, id := range ids {
		if id != "" {
			set[id] = true
		}
	}
	return set
}
