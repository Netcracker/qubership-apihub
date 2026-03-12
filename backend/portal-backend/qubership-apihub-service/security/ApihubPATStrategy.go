package security

import (
	goctx "context"
	"fmt"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/context"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/shaj13/go-guardian/v2/auth"
)

func NewApihubPATStrategy(svc service.PersonalAccessTokenService) auth.Strategy {
	return &apihubPATStrategyImpl{svc: svc}
}

type apihubPATStrategyImpl struct {
	svc service.PersonalAccessTokenService
}

const PATHeader = "X-Personal-Access-Token"

func (a apihubPATStrategyImpl) Authenticate(ctx goctx.Context, r *http.Request) (auth.Info, error) {
	pat := r.Header.Get(PATHeader)
	if pat == "" {
		return nil, fmt.Errorf("authentication failed: '%v' header is empty", PATHeader)
	}
	token, user, systemRole, err := a.svc.GetPATByToken(pat)
	if err != nil {
		return nil, err
	}
	if token == nil {
		return nil, fmt.Errorf("authentication failed: personal access token not found")
	}
	if token.Status != view.PersonaAccessTokenActive {
		return nil, fmt.Errorf("authentication failed: inactive personal access token")
	}
	if user == nil {
		return nil, fmt.Errorf("authentication failed: unable to retrieve user for PAT")
	}

	userExtensions := auth.Extensions{}
	if systemRole != "" {
		userExtensions.Set(context.SystemRoleExt, systemRole)
	}
	return auth.NewDefaultUser(user.Name, user.Id, []string{}, userExtensions), nil
}
