package utils

import (
	"strings"
	"testing"
)

func TestSlugify(t *testing.T) {
	for in, want := range map[string]string{
		"Quote to activation, end to end": "quote-to-activation-end-to-end",
		"  Éléphant & Crème brûlée! ":     "elephant-creme-brulee",
		"Straße über alles":               "stra-e-uber-alles",
		"---":                             "",
		"API v2.0 / Guide":                "api-v2-0-guide",
	} {
		if got := Slugify(in); got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
	long := Slugify(strings.Repeat("a", 200))
	if len(long) != 128 {
		t.Errorf("max length: got %d", len(long))
	}
}

func TestMarkdownTitleAndSubtitle(t *testing.T) {
	title, subtitle := MarkdownTitleAndSubtitle("\n# Onboarding and environments\n\nHow a partner gets from a signed\ncontract to production.\n\n## Steps\n")
	if title != "Onboarding and environments" || subtitle != "How a partner gets from a signed contract to production." {
		t.Fatalf("got %q / %q", title, subtitle)
	}
	if title, subtitle := MarkdownTitleAndSubtitle("no heading"); title != "" || subtitle != "" {
		t.Fatalf("no heading: %q / %q", title, subtitle)
	}
	if title, subtitle := MarkdownTitleAndSubtitle("# Only\n## Next"); title != "Only" || subtitle != "" {
		t.Fatalf("heading only: %q / %q", title, subtitle)
	}
}
