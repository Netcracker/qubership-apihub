package client

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

var (
	ErrUnauthorized = errors.New("apihub: unauthorized")
	ErrForbidden    = errors.New("apihub: forbidden")
	ErrNotFound     = errors.New("apihub: not found")
	ErrUnavailable  = errors.New("apihub: unavailable")
)

// ApihubClient is the thin HTTP client for the APIHUB backend. Calls that act on behalf of a caller take the
// caller's Credential, so APIHUB applies its own RBAC (including the anonymous read scope).
type ApihubClient interface {
	GetPublicKey(ctx context.Context) ([]byte, error)
	GetSystemConfiguration(ctx context.Context) (*view.ApihubSystemConfiguration, error)
	GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKey, error)
	// GetPackage returns the package with the caller's permissions on it (GET /api/v2/packages/{packageId}).
	GetPackage(ctx context.Context, cred Credential, packageId string) (*view.ApihubPackage, error)
	GetVersion(ctx context.Context, cred Credential, packageId, version string) (*view.ApihubVersion, error)
	GetVersions(ctx context.Context, cred Credential, packageId string) (*view.ApihubVersions, error)
	GetVersionDocuments(ctx context.Context, cred Credential, packageId, version string) (*view.ApihubDocuments, error)
	GetVersionDocument(ctx context.Context, cred Credential, packageId, version, slug string) (*view.ApihubDocument, error)
	GetVersionFileRaw(ctx context.Context, cred Credential, packageId, version, slug string) ([]byte, string, error)
}

func NewApihubClient(apihubUrl string, timeout time.Duration) ApihubClient {
	if timeout <= 0 {
		timeout = 10 * time.Second
	}
	return &apihubClientImpl{apihubUrl: strings.TrimRight(apihubUrl, "/"), client: &http.Client{Timeout: timeout}}
}

type apihubClientImpl struct {
	apihubUrl string
	client    *http.Client
}

func (a apihubClientImpl) do(ctx context.Context, cred Credential, path string, accept string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, a.apihubUrl+path, nil)
	if err != nil {
		return nil, err
	}
	if accept != "" {
		req.Header.Set("Accept", accept)
	}
	if cred != nil {
		cred.Apply(req)
	}
	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("%w: GET %s: %v", ErrUnavailable, path, err)
	}
	switch {
	case resp.StatusCode == http.StatusOK:
		return resp, nil
	case resp.StatusCode == http.StatusUnauthorized:
		resp.Body.Close()
		return nil, ErrUnauthorized
	case resp.StatusCode == http.StatusForbidden:
		resp.Body.Close()
		return nil, ErrForbidden
	case resp.StatusCode == http.StatusNotFound, resp.StatusCode == http.StatusMisdirectedRequest:
		resp.Body.Close()
		return nil, ErrNotFound
	case resp.StatusCode >= 500:
		resp.Body.Close()
		return nil, fmt.Errorf("%w: GET %s returned %d", ErrUnavailable, path, resp.StatusCode)
	default:
		resp.Body.Close()
		return nil, fmt.Errorf("apihub: GET %s returned %d", path, resp.StatusCode)
	}
}

func (a apihubClientImpl) getJson(ctx context.Context, cred Credential, path string, out interface{}) error {
	resp, err := a.do(ctx, cred, path, "application/json")
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("apihub: failed to decode GET %s: %w", path, err)
	}
	return nil
}

func (a apihubClientImpl) GetPublicKey(ctx context.Context) ([]byte, error) {
	resp, err := a.do(ctx, nil, "/api/v2/auth/publicKey", "")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(io.LimitReader(resp.Body, 1<<16))
}

func (a apihubClientImpl) GetSystemConfiguration(ctx context.Context) (*view.ApihubSystemConfiguration, error) {
	var out view.ApihubSystemConfiguration
	if err := a.getJson(ctx, nil, "/api/v2/system/configuration", &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (a apihubClientImpl) GetApiKeyByKey(ctx context.Context, apiKey string) (*view.ApihubApiKey, error) {
	var out view.ApihubApiKey
	err := a.getJson(ctx, ApiKeyCredential(apiKey), "/api/v2/auth/apiKey", &out)
	if errors.Is(err, ErrNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &out, nil
}

func (a apihubClientImpl) GetPackage(ctx context.Context, cred Credential, packageId string) (*view.ApihubPackage, error) {
	var out view.ApihubPackage
	path := fmt.Sprintf("/api/v2/packages/%s", url.PathEscape(packageId))
	if err := a.getJson(ctx, cred, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (a apihubClientImpl) GetVersion(ctx context.Context, cred Credential, packageId, version string) (*view.ApihubVersion, error) {
	var out view.ApihubVersion
	path := fmt.Sprintf("/api/v3/packages/%s/versions/%s", url.PathEscape(packageId), url.PathEscape(version))
	if err := a.getJson(ctx, cred, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (a apihubClientImpl) GetVersions(ctx context.Context, cred Credential, packageId string) (*view.ApihubVersions, error) {
	var out view.ApihubVersions
	path := fmt.Sprintf("/api/v3/packages/%s/versions?limit=100", url.PathEscape(packageId))
	if err := a.getJson(ctx, cred, path, &out); err != nil {
		return nil, err
	}
	if out.Versions == nil {
		out.Versions = []view.ApihubVersionListItem{}
	}
	return &out, nil
}

func (a apihubClientImpl) GetVersionDocuments(ctx context.Context, cred Credential, packageId, version string) (*view.ApihubDocuments, error) {
	var out view.ApihubDocuments
	path := fmt.Sprintf("/api/v2/packages/%s/versions/%s/documents?limit=100", url.PathEscape(packageId), url.PathEscape(version))
	if err := a.getJson(ctx, cred, path, &out); err != nil {
		return nil, err
	}
	if out.Documents == nil {
		out.Documents = []view.ApihubDocument{}
	}
	return &out, nil
}

func (a apihubClientImpl) GetVersionDocument(ctx context.Context, cred Credential, packageId, version, slug string) (*view.ApihubDocument, error) {
	var out view.ApihubDocument
	path := fmt.Sprintf("/api/v3/packages/%s/versions/%s/documents/%s", url.PathEscape(packageId), url.PathEscape(version), url.PathEscape(slug))
	if err := a.getJson(ctx, cred, path, &out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (a apihubClientImpl) GetVersionFileRaw(ctx context.Context, cred Credential, packageId, version, slug string) ([]byte, string, error) {
	path := fmt.Sprintf("/api/v2/packages/%s/versions/%s/files/%s/raw", url.PathEscape(packageId), url.PathEscape(version), url.PathEscape(slug))
	resp, err := a.do(ctx, cred, path, "")
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(io.LimitReader(resp.Body, 16<<20))
	if err != nil {
		return nil, "", fmt.Errorf("apihub: failed to read GET %s: %w", path, err)
	}
	return data, resp.Header.Get("Content-Type"), nil
}
