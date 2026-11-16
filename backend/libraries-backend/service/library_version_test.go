package service

import (
	"context"
	"errors"
	"net/http"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
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

// previousVersionRepository answers Get and LatestRelease from fixed versions and fails every other call.
type previousVersionRepository struct {
	repository.LibraryVersionRepository
	versions      map[string]entity.LibraryVersionEntity
	latestRelease *entity.LibraryVersionEntity
}

func (r previousVersionRepository) Get(_ context.Context, _, version string) (*entity.LibraryVersionEntity, error) {
	if ent, ok := r.versions[version]; ok {
		return &ent, nil
	}
	return nil, nil
}

func (r previousVersionRepository) LatestRelease(_ context.Context, _, _ string) (*entity.LibraryVersionEntity, error) {
	return r.latestRelease, nil
}

func TestResolvePreviousVersion(t *testing.T) {
	repo := previousVersionRepository{
		versions: map[string]entity.LibraryVersionEntity{
			"1.0.0": {Version: "1.0.0", Status: string(view.VersionStatusRelease)},
			"1.1.0": {Version: "1.1.0", Status: string(view.VersionStatusDraft)},
		},
		latestRelease: &entity.LibraryVersionEntity{Version: "1.0.0"},
	}
	service := libraryVersionServiceImpl{libraryVersionRepository: repo}

	tests := []struct {
		name     string
		req      view.LibraryVersionImportReq
		want     string
		wantCode string
	}{
		{
			name: "latest release when the request names no previous version",
			req:  view.LibraryVersionImportReq{Version: "2.0.0"},
			want: "1.0.0",
		},
		{
			name: "the named version, whatever its status",
			req:  view.LibraryVersionImportReq{Version: "2.0.0", PreviousVersion: "1.1.0"},
			want: "1.1.0",
		},
		{
			name:     "a version the library does not have",
			req:      view.LibraryVersionImportReq{Version: "2.0.0", PreviousVersion: "0.9.0"},
			wantCode: exception.PreviousVersionNotFound,
		},
		{
			name:     "the imported version itself",
			req:      view.LibraryVersionImportReq{Version: "2.0.0", PreviousVersion: "2.0.0"},
			wantCode: exception.InvalidParameterValue,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := service.resolvePreviousVersion(context.Background(), "lib", tt.req)
			if tt.wantCode == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if got != tt.want {
					t.Errorf("got %q, want %q", got, tt.want)
				}
				return
			}
			var customErr *exception.CustomError
			if !errors.As(err, &customErr) {
				t.Fatalf("got %v, want a CustomError with code %s", err, tt.wantCode)
			}
			if customErr.Code != tt.wantCode || customErr.Status != http.StatusBadRequest {
				t.Errorf("got code %s status %d, want code %s status %d", customErr.Code, customErr.Status, tt.wantCode, http.StatusBadRequest)
			}
		})
	}
}

func TestResolvePreviousVersionWithoutAnyRelease(t *testing.T) {
	service := libraryVersionServiceImpl{libraryVersionRepository: previousVersionRepository{}}
	got, err := service.resolvePreviousVersion(context.Background(), "lib", view.LibraryVersionImportReq{Version: "1.0.0"})
	if err != nil || got != "" {
		t.Errorf("got %q, %v; want an empty version and no error", got, err)
	}
}
