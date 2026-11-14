package utils

import "strings"

func LikeEscaped(s string) string {
	s = strings.Replace(s, "\\", "\\\\\\\\", -1)
	s = strings.Replace(s, "%", "\\%", -1)
	s = strings.Replace(s, "_", "\\_", -1)
	return s
}
