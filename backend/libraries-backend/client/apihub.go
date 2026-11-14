package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"

	log "github.com/sirupsen/logrus"
	"gopkg.in/resty.v1"
)

const apihubRequestTimeout = 60 * time.Second

// ApihubClient reaches portal-backend. This service keeps no user, role, or package of its own: identities
// are authenticated there, the role catalogue is read from there, and a library's parent package lives there.
type ApihubClient interface {
	GetRsaPublicKey(ctx context.Context) (*view.PublicKey, error)
	GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyView, error)
	GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error)
	CheckAuthToken(ctx context.Context, token string) (bool, error)

	GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error)
	GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error)
	GetAvailableRoles(ctx context.Context, packageId string) (*view.PackageRoles, error)
	GetExistingRoles(ctx context.Context) (*view.PackageRoles, error)
	GetUserById(ctx context.Context, userId string) (*view.User, error)
}

func NewApihubClient(apihubUrl, accessToken string) (ApihubClient, error) {
	parsedApihubUrl, err := url.Parse(apihubUrl)
	apihubHost := ""
	if err != nil {
		log.Errorf("Can't parse apihub url: %v", err)
	} else {
		apihubHost = parsedApihubUrl.Hostname()
	}

	cl, err := newSecureHTTPClient(apihubRequestTimeout)
	if err != nil {
		return nil, fmt.Errorf("create APIHUB HTTP client: %w", err)
	}
	client := resty.NewWithClient(cl)
	if apihubHost != "" {
		client.SetRedirectPolicy(resty.DomainCheckRedirectPolicy(apihubHost))
	}

	return &apihubClientImpl{apihubUrl: apihubUrl, accessToken: accessToken, client: client}, nil
}

type apihubClientImpl struct {
	apihubUrl   string
	accessToken string
	client      *resty.Client
}

func (a apihubClientImpl) GetRsaPublicKey(ctx context.Context) (*view.PublicKey, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/publicKey", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get APIHUB public key: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get APIHUB public key: status code %d", resp.StatusCode())
	}
	return &view.PublicKey{Value: resp.Body()}, nil
}

func (a apihubClientImpl) GetApiKeyByKey(apiKey string) (*view.ApihubApiKeyView, error) {
	cl, err := newSecureHTTPClient(apihubRequestTimeout)
	if err != nil {
		return nil, err
	}

	req := resty.NewWithClient(cl).R()
	req.SetHeader("api-key", apiKey)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/apiKey", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to resolve api key: %w", err)
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to resolve api key: status code %d", resp.StatusCode())
	}

	var apiKeyView view.ApihubApiKeyView
	if err := json.Unmarshal(resp.Body(), &apiKeyView); err != nil {
		return nil, err
	}
	return &apiKeyView, nil
}

func (a apihubClientImpl) GetPatByPAT(ctx context.Context, token string) (*view.PersonalAccessTokenExtAuthView, error) {
	cl, err := newSecureHTTPClient(apihubRequestTimeout)
	if err != nil {
		return nil, err
	}

	req := resty.NewWithClient(cl).R()
	req.SetContext(ctx)
	req.SetHeader("X-Personal-Access-Token", token)

	resp, err := req.Get(fmt.Sprintf("%s/api/v2/auth/pat", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to resolve personal access token: %w", err)
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to resolve personal access token: status code %d", resp.StatusCode())
	}

	var pat view.PersonalAccessTokenExtAuthView
	if err := json.Unmarshal(resp.Body(), &pat); err != nil {
		return nil, err
	}
	return &pat, nil
}

func (a apihubClientImpl) CheckAuthToken(ctx context.Context, token string) (bool, error) {
	cl, err := newSecureHTTPClient(apihubRequestTimeout)
	if err != nil {
		return false, err
	}

	req := resty.NewWithClient(cl).R()
	req.SetContext(ctx)
	req.SetHeader("Cookie", fmt.Sprintf("%s=%s", view.AccessTokenCookieName, token))

	resp, err := req.Get(fmt.Sprintf("%s/api/v1/auth/token", a.apihubUrl))
	if err != nil {
		return false, fmt.Errorf("failed to check access token: %w", err)
	}
	if resp.StatusCode() == http.StatusUnauthorized || resp.StatusCode() == http.StatusForbidden {
		return false, nil
	}
	if resp.StatusCode() != http.StatusOK {
		return false, fmt.Errorf("failed to check access token: status code %d", resp.StatusCode())
	}
	return true, nil
}

func (a apihubClientImpl) GetSystemInfo(ctx context.Context) (*view.ApihubSystemInfo, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v1/system/info", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get APIHUB system info: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		return nil, fmt.Errorf("failed to get APIHUB system info: status code %d", resp.StatusCode())
	}
	var systemInfo view.ApihubSystemInfo
	if err := json.Unmarshal(resp.Body(), &systemInfo); err != nil {
		return nil, err
	}
	return &systemInfo, nil
}

func (a apihubClientImpl) GetPackageById(ctx context.Context, id string) (*view.SimplePackage, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s", a.apihubUrl, url.PathEscape(id)))
	if err != nil {
		return nil, fmt.Errorf("failed to get package %s: %w", id, err)
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get package %s: status code %d", id, resp.StatusCode())
	}

	var pkg view.SimplePackage
	if err := json.Unmarshal(resp.Body(), &pkg); err != nil {
		return nil, err
	}
	return &pkg, nil
}

func (a apihubClientImpl) GetAvailableRoles(ctx context.Context, packageId string) (*view.PackageRoles, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/packages/%s/availableRoles", a.apihubUrl, url.PathEscape(packageId)))
	if err != nil {
		return nil, fmt.Errorf("failed to get available roles for package %s: %w", packageId, err)
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get available roles for package %s: status code %d", packageId, resp.StatusCode())
	}

	var roles view.PackageRoles
	if err := json.Unmarshal(resp.Body(), &roles); err != nil {
		return nil, err
	}
	return &roles, nil
}

func (a apihubClientImpl) GetExistingRoles(ctx context.Context) (*view.PackageRoles, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/roles", a.apihubUrl))
	if err != nil {
		return nil, fmt.Errorf("failed to get the APIHUB role catalogue: %w", err)
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get the APIHUB role catalogue: status code %d", resp.StatusCode())
	}

	var roles view.PackageRoles
	if err := json.Unmarshal(resp.Body(), &roles); err != nil {
		return nil, err
	}
	return &roles, nil
}

func (a apihubClientImpl) GetUserById(ctx context.Context, userId string) (*view.User, error) {
	req := a.makeRequest(ctx)
	resp, err := req.Get(fmt.Sprintf("%s/api/v2/users/%s", a.apihubUrl, url.PathEscape(userId)))
	if err != nil {
		return nil, fmt.Errorf("failed to get user %s: %w", userId, err)
	}
	if resp.StatusCode() == http.StatusNotFound {
		return nil, nil
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return nil, authErr
		}
		return nil, fmt.Errorf("failed to get user %s: status code %d", userId, resp.StatusCode())
	}

	var user view.User
	if err := json.Unmarshal(resp.Body(), &user); err != nil {
		return nil, err
	}
	return &user, nil
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

func newSecureHTTPClient(timeout time.Duration) (*http.Client, error) {
	tlsConfig, err := utils.BuildSecureTLSConfig(nil)
	if err != nil {
		return nil, err
	}
	tr := http.Transport{TLSClientConfig: tlsConfig}
	return &http.Client{Transport: &tr, Timeout: timeout}, nil
}

func (a apihubClientImpl) makeRequest(ctx context.Context) *resty.Request {
	req := a.client.R()
	req.SetContext(ctx)

	if secctx.IsSystem(ctx) {
		req.SetHeader("api-key", a.accessToken)
		return req
	}
	if secctx.GetUserToken(ctx) != "" {
		req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", secctx.GetUserToken(ctx)))
	} else if secctx.GetApiKey(ctx) != "" {
		req.SetHeader("api-key", secctx.GetApiKey(ctx))
	} else if secctx.GetPersonalAccessToken(ctx) != "" {
		req.SetHeader("X-Personal-Access-Token", secctx.GetPersonalAccessToken(ctx))
	}
	return req
}
