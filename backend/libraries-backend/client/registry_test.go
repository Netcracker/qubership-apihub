package client

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"

	"gopkg.in/resty.v1"
)

const testMetadata = `<?xml version="1.0" encoding="UTF-8"?>
<metadata>
  <groupId>com.example</groupId>
  <artifactId>demo-lib</artifactId>
  <versioning>
    <latest>1.2.0</latest>
    <release>1.2.0</release>
    <versions>
      <version>1.0.0</version>
      <version>1.1.0</version>
      <version>1.2.0</version>
    </versions>
  </versioning>
</metadata>`

func TestMavenMetadataUrl(t *testing.T) {
	tests := []struct {
		name     string
		registry config.RegistryConfig
		want     string
	}{
		{
			name:     "artifactory",
			registry: config.RegistryConfig{Type: registryTypeArtifactory, BaseUrl: "https://host/artifactory/"},
			want:     "https://host/artifactory/maven-remote/com/example/demo-lib/maven-metadata.xml",
		},
		{
			name:     "nexus",
			registry: config.RegistryConfig{Type: registryTypeNexus, BaseUrl: "https://host"},
			want:     "https://host/repository/maven-remote/com/example/demo-lib/maven-metadata.xml",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := mavenMetadataUrl(tt.registry, "maven-remote", "com.example", "demo-lib")
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %s, want %s", got, tt.want)
			}
		})
	}
}

func TestListMavenVersions(t *testing.T) {
	var gotPath, gotUser, gotPassword string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotUser, gotPassword, _ = r.BasicAuth()
		if r.URL.Path != "/repository/maven-remote/com/example/demo-lib/maven-metadata.xml" {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		_, _ = w.Write([]byte(testMetadata))
	}))
	defer server.Close()

	cl := registryClientImpl{client: resty.New()}
	registry := config.RegistryConfig{
		Id:       "nexus-1",
		Type:     registryTypeNexus,
		BaseUrl:  server.URL,
		Username: "reader",
		Password: "secret",
	}

	versions, err := cl.ListMavenVersions(context.Background(), registry, "maven-remote", "com.example", "demo-lib")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if want := []string{"1.0.0", "1.1.0", "1.2.0"}; !reflect.DeepEqual(versions, want) {
		t.Errorf("got %v, want %v", versions, want)
	}
	if gotUser != "reader" || gotPassword != "secret" {
		t.Errorf("basic auth not sent, path %s", gotPath)
	}

	_, err = cl.ListMavenVersions(context.Background(), registry, "maven-remote", "com.example", "missing")
	var customErr *exception.CustomError
	if !errors.As(err, &customErr) || customErr.Code != exception.LibraryArtifactNotFound {
		t.Errorf("got %v, want LibraryArtifactNotFound", err)
	}
}
