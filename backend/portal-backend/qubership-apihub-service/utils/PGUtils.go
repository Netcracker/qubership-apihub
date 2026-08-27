package utils

import (
	"fmt"
	"strings"
)

const (
	// ~>=~ and ~<~ compare byte-wise regardless of the database locale; plain >= and < compare per collation and
	// belong to another operator family, which no varchar_pattern_ops index can serve.
	// '/' is the byte right after '.', so the range covers exactly "root.<anything>" and excludes siblings such
	// as "rootX".
	// The concatenation must be parenthesised: || binds looser than the pattern operators, so without brackets
	// PostgreSQL parses "id ~>=~ root || '.'" as "(id ~>=~ root) || '.'" and rejects the text result.
	subtreeConditionTemplate     = "(%[1]s = %[2]s or (%[1]s ~>=~ (%[2]s || '.') and %[1]s ~<~ (%[2]s || '/')))"
	descendantsConditionTemplate = "(%[1]s ~>=~ (%[2]s || '.') and %[1]s ~<~ (%[2]s || '/'))"

	cteSeparator       = ",\n\t"
	conditionSeparator = "\n\t  and "
)

func LikeEscaped(s string) string {
	s = strings.Replace(s, "\\", "\\\\\\\\", -1)
	s = strings.Replace(s, "%", "\\%", -1)
	s = strings.Replace(s, "_", "\\_", -1)
	return s
}

func SubtreeCondition(idColumn string, rootExpr string) string {
	return fmt.Sprintf(subtreeConditionTemplate, idColumn, rootExpr)
}

func DescendantsCondition(idColumn string, rootExpr string) string {
	return fmt.Sprintf(descendantsConditionTemplate, idColumn, rootExpr)
}

func WithClause(ctes []string) string {
	if len(ctes) == 0 {
		return ""
	}
	return "with " + strings.Join(ctes, cteSeparator)
}

func WhereClause(conditions []string) string {
	if len(conditions) == 0 {
		return ""
	}
	return "where " + strings.Join(conditions, conditionSeparator)
}

func PagingClause(limit int) string {
	if limit <= 0 {
		return "offset ?offset"
	}
	return "limit ?limit offset ?offset"
}
