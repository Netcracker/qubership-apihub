package service

import (
	"reflect"
	"testing"
)

func TestFilterAvailableVersions(t *testing.T) {
	registry := []string{"1.0.0", "1.1.0", "1.2.0-RC1", "1.2.0", "2.0.0"}
	tests := []struct {
		name       string
		imported   []string
		textFilter string
		want       []string
	}{
		{
			name:     "imported versions are dropped and the newest comes first",
			imported: []string{"1.1.0", "2.0.0"},
			want:     []string{"1.2.0", "1.2.0-RC1", "1.0.0"},
		},
		{
			name:       "text filter is case-insensitive",
			textFilter: "rc",
			want:       []string{"1.2.0-RC1"},
		},
		{
			name:     "everything imported",
			imported: registry,
			want:     []string{},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := filterAvailableVersions(registry, tt.imported, tt.textFilter)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestPaginate(t *testing.T) {
	items := []string{"a", "b", "c"}
	if got := paginate(items, 2, 1); !reflect.DeepEqual(got, []string{"c"}) {
		t.Errorf("got %v, want [c]", got)
	}
	if got := paginate(items, 2, 2); len(got) != 0 {
		t.Errorf("got %v, want empty", got)
	}
}
