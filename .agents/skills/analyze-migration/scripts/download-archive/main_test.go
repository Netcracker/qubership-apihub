package main

import (
	"archive/zip"
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func TestDownloadArchivesAndRejectFailedResponses(t *testing.T) {
	const buildID = "00000000-0000-4000-8000-000000000002"
	var zipped bytes.Buffer
	zw := zip.NewWriter(&zipped)
	entry, err := zw.Create("spec.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := io.WriteString(entry, "openapi: 3.0.0"); err != nil {
		t.Fatal(err)
	}
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name      string
		status    int
		body      []byte
		wantError bool
	}{
		{"valid", http.StatusOK, zipped.Bytes(), false},
		{"missing", http.StatusNotFound, []byte("not found"), true},
		{"invalid zip", http.StatusOK, []byte("not a zip"), true},
		{"redirect", http.StatusFound, nil, true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			calls := 0
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				calls++
				if r.URL.Path != "/deployment/api/v2/admin/builds/"+buildID+"/sources" || r.Header.Get("api-key") != "test-key" || r.Header.Get("Accept") != "application/octet-stream" {
					t.Error("incorrect archive path or credentials")
				}
				w.Header().Set("Location", "/redirect-target")
				w.WriteHeader(tc.status)
				if _, err := w.Write(tc.body); err != nil {
					t.Error(err)
				}
			}))
			defer server.Close()
			t.Setenv("APIHUB_URL", server.URL+"/deployment")
			t.Setenv("APIHUB_API_KEY", "test-key")
			t.Setenv("APIHUB_READ_ONLY_API_KEY", "viewer-key")
			output := filepath.Join(t.TempDir(), "sources.zip")
			err := run([]string{buildID, "sources", output})
			if (err != nil) != tc.wantError || calls != 1 {
				t.Fatalf("error=%v, requests=%d", err, calls)
			}
			if os.Getenv("APIHUB_API_KEY") != "" || os.Getenv("APIHUB_READ_ONLY_API_KEY") != "" {
				t.Error("process keys were not cleared")
			}
			data, readErr := os.ReadFile(output)
			if tc.wantError {
				if !errors.Is(readErr, os.ErrNotExist) {
					t.Fatal("failed download left an output")
				}
			} else if readErr != nil || !bytes.Equal(data, zipped.Bytes()) {
				t.Fatal("archive bytes changed")
			}
			leftovers, err := filepath.Glob(filepath.Join(filepath.Dir(output), ".archive-*"))
			if err != nil || len(leftovers) != 0 {
				t.Fatal("temporary download remains")
			}
		})
	}
}
