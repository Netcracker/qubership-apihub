package apiutil

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestArchiveCredentialsRemainRestrictedToArchiveMode(t *testing.T) {
	const archive = "/api/v2/admin/builds/00000000-0000-4000-8000-000000000002/result"
	expectedKey := "viewer"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("api-key") != expectedKey {
			t.Error("wrong credential selected")
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	for _, archiveMode := range []bool{false, true} {
		if archiveMode {
			expectedKey = "migration"
		}
		resp, err := get(server.URL, archive, "migration", "viewer", archiveMode)
		if err != nil {
			t.Fatal(err)
		}
		if err := resp.Body.Close(); err != nil {
			t.Fatal(err)
		}
	}
	for _, endpoint := range []string{"/api/v2/packages", archive + "?extra=true", archive + "/../sources"} {
		if _, err := get(server.URL, endpoint, "migration", "viewer", true); err == nil {
			t.Fatalf("archive mode accepted %s", endpoint)
		}
	}
	if _, err := get(server.URL+"?secret=x", archive, "migration", "viewer", true); err == nil {
		t.Fatal("accepted invalid base URL")
	}
}
