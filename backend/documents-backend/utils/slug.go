package utils

import (
	"regexp"
	"strings"
	"unicode"

	"golang.org/x/text/unicode/norm"
)

var nonSlugRunes = regexp.MustCompile(`[^a-z0-9]+`)

// Slugify mirrors the UI rule: NFKD-normalise, strip accents, lowercase, collapse non [a-z0-9] runs to '-',
// trim dashes, cap at 128 characters.
func Slugify(title string) string {
	decomposed := norm.NFKD.String(title)
	var b strings.Builder
	for _, r := range decomposed {
		if unicode.Is(unicode.Mn, r) {
			continue // combining accent marks
		}
		b.WriteRune(unicode.ToLower(r))
	}
	slug := nonSlugRunes.ReplaceAllString(b.String(), "-")
	slug = strings.Trim(slug, "-")
	if len(slug) > 128 {
		slug = strings.TrimRight(slug[:128], "-")
	}
	return slug
}
