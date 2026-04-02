package utils

import (
	"path/filepath"
	"regexp"
	"strings"
)

var unsafeNameChars = regexp.MustCompile(`[^a-zA-Z0-9\-_]`)

func SanitizeFilename(filename string, fallback string) string {
	filename = filepath.Base(filename)
	ext := filepath.Ext(filename)
	if ext == "." {
		ext = ""
	}
	name := strings.TrimSuffix(filename, ext)

	name = unsafeNameChars.ReplaceAllString(name, "")

	if name == "" {
		name = fallback
	}

	return name + ext
}
