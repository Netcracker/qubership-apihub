package utils

import (
	"path/filepath"
	"regexp"
)

var unsafeFilenameChars = regexp.MustCompile(`[^a-zA-Z0-9.\-_]`)

func SanitizeFilename(filename string, fallback string) string {
	filename = filepath.Base(filename)
	filename = unsafeFilenameChars.ReplaceAllString(filename, "")
	if filename == "" || filename == "." {
		filename = fallback
	}
	return filename
}
