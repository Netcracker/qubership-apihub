package client

import (
	"context"
	"encoding/xml"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/config"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"

	"gopkg.in/resty.v1"
)

const registryRequestTimeout = 30 * time.Second

const (
	registryTypeArtifactory = "artifactory"
	registryTypeNexus       = "nexus"
)

// RegistryClient reads artifact metadata from the external registries listed in the configuration.
type RegistryClient interface {
	// ListMavenVersions returns the versions that maven-metadata.xml of the artifact lists, in the order the
	// file lists them. It returns LibraryArtifactNotFound when the repository has no metadata for the artifact.
	ListMavenVersions(ctx context.Context, registry config.RegistryConfig, repository, groupId, artifactId string) ([]string, error)
}

func NewRegistryClient() (RegistryClient, error) {
	cl, err := newSecureHTTPClient(registryRequestTimeout)
	if err != nil {
		return nil, fmt.Errorf("create registry HTTP client: %w", err)
	}
	return registryClientImpl{client: resty.NewWithClient(cl)}, nil
}

type registryClientImpl struct {
	client *resty.Client
}

type mavenMetadata struct {
	Versions []string `xml:"versioning>versions>version"`
}

func (c registryClientImpl) ListMavenVersions(ctx context.Context, registry config.RegistryConfig, repository, groupId, artifactId string) ([]string, error) {
	metadataUrl, err := mavenMetadataUrl(registry, repository, groupId, artifactId)
	if err != nil {
		return nil, registryRequestFailed(registry.Id, err.Error())
	}

	req := c.client.R().SetContext(ctx)
	if registry.Username != "" {
		req.SetBasicAuth(registry.Username, registry.Password)
	}
	resp, err := req.Get(metadataUrl)
	if err != nil {
		return nil, registryRequestFailed(registry.Id, err.Error())
	}
	switch resp.StatusCode() {
	case http.StatusOK:
	case http.StatusNotFound:
		return nil, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.LibraryArtifactNotFound,
			Message: exception.LibraryArtifactNotFoundMsg,
			Params:  map[string]interface{}{"artifact": groupId + ":" + artifactId, "repository": repository},
		}
	default:
		return nil, registryRequestFailed(registry.Id, fmt.Sprintf("GET %s returned status code %d", metadataUrl, resp.StatusCode()))
	}

	var metadata mavenMetadata
	if err := xml.Unmarshal(resp.Body(), &metadata); err != nil {
		return nil, registryRequestFailed(registry.Id, fmt.Sprintf("failed to parse %s: %v", metadataUrl, err))
	}
	versions := make([]string, 0, len(metadata.Versions))
	for _, version := range metadata.Versions {
		if trimmed := strings.TrimSpace(version); trimmed != "" {
			versions = append(versions, trimmed)
		}
	}
	return versions, nil
}

// mavenMetadataUrl builds the URL of maven-metadata.xml for an artifact. Artifactory serves a repository
// directly under its base URL, which already ends with the /artifactory context; Nexus 3 serves it under
// /repository/.
func mavenMetadataUrl(registry config.RegistryConfig, repository, groupId, artifactId string) (string, error) {
	segments := make([]string, 0)
	switch registry.Type {
	case registryTypeArtifactory:
	case registryTypeNexus:
		segments = append(segments, "repository")
	default:
		return "", fmt.Errorf("unsupported registry type '%s'", registry.Type)
	}
	segments = append(segments, url.PathEscape(repository))
	for _, part := range strings.Split(groupId, ".") {
		segments = append(segments, url.PathEscape(part))
	}
	segments = append(segments, url.PathEscape(artifactId), "maven-metadata.xml")
	return strings.TrimSuffix(registry.BaseUrl, "/") + "/" + strings.Join(segments, "/"), nil
}

func registryRequestFailed(registryId, details string) error {
	return &exception.CustomError{
		Status:  http.StatusBadGateway,
		Code:    exception.RegistryRequestFailed,
		Message: exception.RegistryRequestFailedMsg,
		Params:  map[string]interface{}{"registryId": registryId},
		Debug:   details,
	}
}
