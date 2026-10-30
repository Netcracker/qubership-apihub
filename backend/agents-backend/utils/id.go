package utils

import "strings"

func ToId(part string) string {
	return strings.ToUpper(strings.Replace(part, " ", "-", -1))
}
