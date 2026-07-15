package client

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-agent/secctx"
	"github.com/Netcracker/qubership-apihub-agent/utils"
	"github.com/Netcracker/qubership-apihub-agent/view"
	"gopkg.in/resty.v1"
)

type AgentsBackendClient interface {
	SendKeepaliveMessage(pathPrefix string, msg view.AgentKeepaliveMessage) (string, error)
}

func NewAgentsBackendClient(apihubUrl string, accessToken string) (AgentsBackendClient, error) {
	httpClient, err := utils.CreateSecureHTTPClient(time.Second * 60)
	if err != nil {
		return nil, err
	}
	return &agentsBackendClientImpl{
		apihubUrl:   apihubUrl,
		accessToken: accessToken,
		restyClient: resty.NewWithClient(httpClient),
	}, nil
}

type agentsBackendClientImpl struct {
	apihubUrl   string
	accessToken string
	restyClient *resty.Client
}

func (a agentsBackendClientImpl) SendKeepaliveMessage(pathPrefix string, msg view.AgentKeepaliveMessage) (string, error) {
	req := a.makeRequest(secctx.CreateSystemContext())
	req.SetBody(msg)

	resp, err := req.Post(fmt.Sprintf("%s/%s/api/v2/agents", a.apihubUrl, pathPrefix))
	if err != nil {
		return "", err
	}
	if resp.StatusCode() != http.StatusOK {
		if authErr := checkUnauthorized(resp); authErr != nil {
			return "", authErr
		}
		return "", fmt.Errorf("failed to send registration message with error code %d", resp.StatusCode())
	}
	body := resp.Body()
	if len(body) > 0 {
		type agentVersion struct {
			Version string `json:"version"`
		}
		var version agentVersion
		err = json.Unmarshal(body, &version)
		if err != nil {
			return "", err
		}
		return version.Version, nil
	}

	return "", nil
}

func (a agentsBackendClientImpl) makeRequest(ctx secctx.SecurityContext) *resty.Request {
	req := a.restyClient.R()
	if ctx.GetUserToken() != "" {
		req.SetHeader("Authorization", fmt.Sprintf("Bearer %s", ctx.GetUserToken()))
	} else {
		req.SetHeader("api-key", a.accessToken)
	}
	return req
}
