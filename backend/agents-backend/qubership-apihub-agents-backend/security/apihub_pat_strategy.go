package security

import (
	goctx "context"
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-agents-backend/client"
	"github.com/Netcracker/qubership-apihub-agents-backend/secctx"
	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubPATStrategy(apihubClient client.ApihubClient) auth.Strategy {
	return &apihubPATStrategyImpl{apihubClient: apihubClient}
}

type apihubPATStrategyImpl struct {
	apihubClient client.ApihubClient
}

const PATHeader = "X-Personal-Access-Token"

func (a apihubPATStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	pat := r.Header.Get(PATHeader)
	if pat == "" {
		return nil, fmt.Errorf("authentication failed: '%v' header is empty", PATHeader)
	}

	patResp, err := a.apihubClient.GetPatByPAT(ctx, pat)
	if err != nil {
		return nil, err
	}
	if patResp == nil {
		return nil, fmt.Errorf("authentication failed: personal access token not found")
	}

	userExtensions := auth.Extensions{}
	for _, sysRole := range patResp.SystemRoles {
		userExtensions.Add(secctx.SystemRoleExt, sysRole)
	}

	return auth.NewDefaultUser(patResp.User.Name, patResp.User.Id, []string{}, userExtensions), nil
}
