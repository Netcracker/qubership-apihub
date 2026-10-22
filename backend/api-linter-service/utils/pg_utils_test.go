package utils

import "testing"

func TestLikeEscaped(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"plain text", "plain", "plain"},
		{"empty", "", ""},
		{"percent", "100%", `100\%`},
		{"underscore", "a_b", `a\_b`},
		{"percent and underscore", "a%_b", `a\%\_b`},
		{"backslash", `\`, `\\\\`},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := LikeEscaped(tt.in)
			if got != tt.want {
				t.Errorf("LikeEscaped(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}
