package service

import "testing"

func TestMakeBackendVersion(t *testing.T) {
	tests := []struct {
		name       string
		branch     string
		hash       string
		commitTime string
		want       string
	}{
		{name: "no variables", want: "unknown"},
		{name: "branch, commit, and time", branch: "develop", hash: "a1b2c3d", commitTime: "20261026104501", want: "develop.a1b2c3d.20261026104501"},
		{name: "no commit time", branch: "develop", hash: "a1b2c3d", want: "develop.a1b2c3d"},
		{name: "commit time alone is not a version", commitTime: "20261026104501", want: "unknown"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := makeBackendVersion(tt.branch, tt.hash, tt.commitTime); got != tt.want {
				t.Errorf("makeBackendVersion(%q, %q, %q) = %q, want %q", tt.branch, tt.hash, tt.commitTime, got, tt.want)
			}
		})
	}
}
