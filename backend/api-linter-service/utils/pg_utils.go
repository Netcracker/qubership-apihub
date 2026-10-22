package utils

import "strings"

// LikeEscaped escapes backslash, percent, and underscore so the string can sit inside a SQL LIKE pattern.
// A backslash becomes four backslashes. Percent and underscore each gain one backslash.
func LikeEscaped(s string) string {
	s = strings.Replace(s, "\\", "\\\\\\\\", -1)
	s = strings.Replace(s, "%", "\\%", -1)
	s = strings.Replace(s, "_", "\\_", -1)
	return s
}
