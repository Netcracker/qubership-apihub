package client

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-api-linter-service/exception"
	"github.com/Netcracker/qubership-api-linter-service/secctx"
	"github.com/Netcracker/qubership-api-linter-service/view"

	"time"

	log "github.com/sirupsen/logrus"
	"gopkg.in/resty.v1"
)

type ApihubClient interface {
	GetRsaPublicKey(ctx context.Context) (*view.PublicKey, error)
	GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyView, error)

	GetPackagesList(ctx context.Context, packageListReq view.PackageListReq) (*view.Packages, error)
	GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error)
	GetVersion(ctx context.Context, id, version string) (*view.VersionContent, error)
	ListPackageVersions(ctx context.Context, packageId string) ([]view.PackageVersion, error)

	GetVersionDocuments(ctx context.Context, packageId, version string) (*view.VersionDocuments, error)
	GetDocumentRawData(ctx context.Context, packageId, version string, fileId string) ([]byte, error)
	GetDocumentDetails(ctx context.Context, packageId, version string, slug string) (*view.PublishedDocument, error)

	GetOperationWithData(ctx context.Context, packageId, version string, apiType view.OpApiType, operationId string) (*view.Operation, error)

	CheckAuthToken(ctx context.Context, token string) (bool, error)
	GetUserByPAT(ctx context.Context, token string) (*view.User, error)
	GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error)

	GetAvailableRoles(ctx context.Context, packageId string) (*view.PackageRoles, error)

	GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error)
}

func NewApihubClient(apihubUrl, accessToken string) ApihubClient {
	parsedApihubUrl, err := url.Parse(apihubUrl)
	apihubHost := ""
	if err != nil {
		log.Errorf("Can't parse apihub url: %v", err)
	} else {
		apihubHost = parsedApihubUrl.Hostname()
	}

	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}
	client := resty.NewWithClient(&cl)
	if apihubHost != "" {
		client.SetRedirectPolicy(resty.DomainCheckRedirectPolicy(apihubHost))
	}

	return &apihubClientImpl{apihubUrl: apihubUrl, accessToken: accessToken, apiHubHost: apihubHost, client: client}
}

type apihubClientImpl struct {
	apihubUrl   string
	accessToken string
	apiHubHost  string
	client      *resty.Client
}

func (a apihubClientImpl) GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyView, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()

	req.SetHeader("api-key", apiKey)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/apiKey", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		return nil, err
	}

	var apiKeyView view.ApihubApiKeyView
	err = json.Unmarshal(resp.Body(), &apiKeyView)
	if err != nil {
		return nil, err
	}

	return &apiKeyView, nil
}

func checkUnauthorized(resp *resty.Response) error {
	if resp != nil && (resp.StatusCode() == http.StatusUnauthorized || resp.StatusCode() == http.StatusForbidden) {
		log.Errorf("Incorrect api key detected!")
		return &exception.CustomError{
			Status:  http.StatusFailedDependency,
			Code:    exception.NoApihubAccess,
			Message: exception.NoApihubAccessMsg,
			Params:  map[string]interface{}{"code": strconv.Itoa(resp.StatusCode())},
		}
	}
	return nil
}

func checkCustomError(resp *resty.Response) error {
	if resp != nil && len(resp.Body()) > 0 {
		var cursomErr exception.CustomError
		jsonErr := json.Unmarshal(resp.Body(), &cursomErr)
		if jsonErr == nil && cursomErr.Code != "" && cursomErr.Message != "" {
			return &cursomErr
		}
	}
	return nil
}

func (a apihubClientImpl) GetRsaPublicKey(ctx context.Context) (*view.PublicKey, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/publicKey", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		// resp could be nil here - in this case the next row will fall to panic()
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		return nil, err
	}

	publicKey := view.PublicKey{
		Value: resp.Body(),
	}
	return &publicKey, nil
}

func (a apihubClientImpl) GetPackagesList(ctx context.Context, packageListReq view.PackageListReq) (*view.Packages, error) {
	req := a.makeRequest(ctx)

	if packageListReq.TextFilter != "" {
		req.SetQueryParam("textFilter", packageListReq.TextFilter)
	}
	if packageListReq.ParentID != "" {
		req.SetQueryParam("parentId", packageListReq.ParentID)
	}
	if len(packageListReq.Kind) > 0 {
		req.SetQueryParam("kind", strings.Join(packageListReq.Kind, ","))
	}
	if packageListReq.ServiceName != "" {
		req.SetQueryParam("serviceName", packageListReq.ServiceName)
	}

	if packageListReq.ShowParents != nil {
		req.SetQueryParam("showParents", strconv.FormatBool(*packageListReq.ShowParents))
	}
	if packageListReq.LastReleaseVersionDetails != nil {
		req.SetQueryParam("lastReleaseVersionDetails", strconv.FormatBool(*packageListReq.LastReleaseVersionDetails))
	}
	if packageListReq.ShowAllDescendants != nil {
		req.SetQueryParam("showAllDescendants", strconv.FormatBool(*packageListReq.ShowAllDescendants))
	}

	// Set integer parameters
	if packageListReq.Limit != nil {
		req.SetQueryParam("limit", strconv.Itoa(*packageListReq.Limit))
	}
	if packageListReq.Page != nil {
		req.SetQueryParam("page", strconv.Itoa(*packageListReq.Page))
	}

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages", a.apihubUrl))
	if err != nil {
		return nil, err
	}

	// Check for error status codes
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to list packages: status code %d %v", resp.StatusCode(), resp.Body())
	}

	// Parse successful response
	var packageResponse view.Packages
	err = json.Unmarshal(resp.Body(), &packageResponse)
	if err != nil {
		return nil, err
	}

	return &packageResponse, nil
}

func (a apihubClientImpl) GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s", a.apihubUrl, url.PathEscape(id)))

	if err != nil {
		return nil, err
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get package by id -  %s : status code %d %v", id, resp.StatusCode(), err)
	}

	var pkg view.SimplePackage

	err = json.Unmarshal(resp.Body(), &pkg)
	if err != nil {
		return nil, err
	}
	return &pkg, nil
}

func (a apihubClientImpl) GetVersion(ctx context.Context, id, version string) (*view.VersionContent, error) {

	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions/%s", a.apihubUrl, url.PathEscape(id), url.PathEscape(version)))
	if err != nil {
		return nil, fmt.Errorf("failed to get version %s for id %s: %s", version, id, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version %s for id %s: status code %d %v", version, id, resp.StatusCode(), err)
	}
	var pVersion view.VersionContent
	err = json.Unmarshal(resp.Body(), &pVersion)
	if err != nil {
		return nil, err
	}
	return &pVersion, nil
}

func (a apihubClientImpl) ListPackageVersions(ctx context.Context, packageId string) ([]view.PackageVersion, error) {
	var allVersions []view.PackageVersion
	limit := 100
	page := 0

	for {
		req := a.makeRequest(ctx)
		req.SetQueryParam("limit", strconv.Itoa(limit))
		req.SetQueryParam("page", strconv.Itoa(page))

		resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions", a.apihubUrl, url.PathEscape(packageId)))
		if err != nil {
			return nil, fmt.Errorf("failed to list versions for package %s: %w", packageId, err)
		}

		if resp.StatusCode() != http.StatusOK {
			if resp.StatusCode() == http.StatusNotFound {
				return nil, nil
			}
			if authErr := checkUnauthorized(resp); authErr != nil {
				return nil, authErr
			}
			if customErr := checkCustomError(resp); customErr != nil {
				return nil, customErr
			}
			return nil, fmt.Errorf("failed to list versions for package %s: status code %d %s", packageId, resp.StatusCode(), string(resp.Body()))
		}

		var versionsResp view.PackageVersionsResponse
		if err := json.Unmarshal(resp.Body(), &versionsResp); err != nil {
			return nil, err
		}

		allVersions = append(allVersions, versionsResp.Versions...)
		if len(versionsResp.Versions) < limit {
			break
		}
		page++
	}

	return allVersions, nil
}

func (a apihubClientImpl) GetVersionDocuments(ctx context.Context, packageId, version string) (*view.VersionDocuments, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/versions/%s/documents", a.apihubUrl, url.PathEscape(packageId), url.PathEscape(version)))
	if err != nil {
		return nil, fmt.Errorf("failed to get version %s for id %s: %s", version, packageId, err.Error())
	}

	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version documents. version - %s for id %s: status code %d %v", version, packageId, resp.StatusCode(), resp.Body())
	}
	var versionDocuments view.VersionDocuments
	err = json.Unmarshal(resp.Body(), &versionDocuments)
	if err != nil {
		return nil, err
	}
	return &versionDocuments, nil
}

func (a apihubClientImpl) GetDocumentRawData(ctx context.Context, packageId, version string, fileSlug string) ([]byte, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/versions/%s/files/%s/raw", a.apihubUrl, url.PathEscape(packageId), url.PathEscape(version), url.PathEscape(fileSlug)))
	if err != nil {
		return nil, fmt.Errorf("failed to get document %s for package %s, version %s: %s", fileSlug, packageId, version, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get document %s for package %s, version %s: status code %d %v", fileSlug, packageId, version, resp.StatusCode(), resp.Body())
	}

	return resp.Body(), nil
}

func (a apihubClientImpl) GetDocumentDetails(ctx context.Context, packageId, version string, slug string) (*view.PublishedDocument, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v3/packages/%s/versions/%s/documents/%s", a.apihubUrl, url.PathEscape(packageId), url.PathEscape(version), url.PathEscape(slug)))
	if err != nil {
		return nil, fmt.Errorf("failed to get document details for package %s, version %s, slug %s: %s", packageId, version, slug, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		if resp.StatusCode() == http.StatusNotFound {
			return nil, nil
		}
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get version documents. version - %s for id %s: status code %d %v", version, packageId, resp.StatusCode(), resp.Body())
	}
	var publishedDocument view.PublishedDocument
	err = json.Unmarshal(resp.Body(), &publishedDocument)
	if err != nil {
		return nil, err
	}
	return &publishedDocument, nil
}

func (a apihubClientImpl) GetOperationWithData(ctx context.Context, packageId, version string, apiType view.OpApiType, operationId string) (*view.Operation, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/versions/%s/%s/operations/%s", a.apihubUrl, url.PathEscape(packageId), url.PathEscape(version), apiType, url.PathEscape(operationId)))
	if err != nil {
		return nil, fmt.Errorf("failed to get operation with data for package %s, version %s, operation id %s: %s", packageId, version, operationId, err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get operation with data for package %s, version %s, operation id %s: status code %d %v", packageId, version, operationId, resp.StatusCode(), resp.Body())
	}
	var operation view.Operation
	err = json.Unmarshal(resp.Body(), &operation)
	if err != nil {
		return nil, err
	}
	return &operation, nil
}

func (a apihubClientImpl) CheckAuthToken(ctx context.Context, token string) (bool, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
	req.SetContext(ctx)
	req.SetHeader("Cookie", fmt.Sprintf("%s=%s", view.AccessTokenCookieName, token))

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/auth/token", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (a apihubClientImpl) GetUserByPAT(ctx context.Context, token string) (*view.User, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
	req.SetContext(ctx)
	req.SetHeader("X-Personal-Access-Token", token)

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/user", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, nil
		}
		return nil, err
	}

	var user view.User
	err = json.Unmarshal(resp.Body(), &user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (a apihubClientImpl) GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error) {
	tr := http.Transport{TLSClientConfig: &tls.Config{InsecureSkipVerify: true}}
	cl := http.Client{Transport: &tr, Timeout: time.Second * 60}

	client := resty.NewWithClient(&cl)
	req := client.R()
	req.SetContext(ctx)
	req.SetHeader("X-Personal-Access-Token", token)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/pat", a.apihubUrl))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, nil
		}
		return nil, err
	}

	var pat view.PersonalAccessTokenExtAuthView
	err = json.Unmarshal(resp.Body(), &pat)
	if err != nil {
		return nil, err
	}

	return &pat, nil
}

func (a apihubClientImpl) GetAvailableRoles(ctx context.Context, packageId string) (*view.PackageRoles, error) {
	req := a.makeRequest(ctx)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/availableRoles", a.apihubUrl, packageId))
	if err != nil || resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, nil
		}
		return nil, err
	}

	var roles view.PackageRoles
	err = json.Unmarshal(resp.Body(), &roles)
	if err != nil {
		return nil, err
	}

	return &roles, nil
}

func (a apihubClientImpl) GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/system/info", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get APIHUB system info: %s", err.Error())
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get APIHUB system info: status code %d", resp.StatusCode())
	}
	var config view.ApihubSystemInfo
	err = json.Unmarshal(resp.Body(), &config)
	if err != nil {
		return nil, err
	}
	return &config, nil
}

func (a apihubClientImpl) makeRequest(ctx context.Context) *resty.Request {
	req := a.client.R()
	req.SetContext(ctx)

	if secctx.IsSystem(ctx) {
		req.SetHeader("api-key", a.accessToken)
	} else {
		if secctx.GetUserToken(ctx) != "" {
			req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", secctx.GetUserToken(ctx)))
		} else if secctx.GetApiKey(ctx) != "" {
			req.SetHeader("api-key", secctx.GetApiKey(ctx))
		} else if secctx.GetPersonalAccessToken(ctx) != "" {
			req.SetHeader("X-Personal-Access-Token", secctx.GetPersonalAccessToken(ctx))
		}
	}
	return req
}
