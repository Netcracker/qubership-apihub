package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
)

type LogoutController interface {
	Logout(http.ResponseWriter, *http.Request)
}

func NewLogoutController(tokenRevocationService service.TokenRevocationService, systemInfoService service.SystemInfoService) LogoutController {
	authConfig := systemInfoService.GetAuthConfig()
	var refreshTokenPaths []string
	for _, idp := range authConfig.Providers {
		if idp.RefreshTokenEndpoint != "" {
			refreshTokenPaths = append(refreshTokenPaths, idp.RefreshTokenEndpoint)
		} else if idp.LoginStartEndpoint != "" {
			refreshTokenPaths = append(refreshTokenPaths, idp.LoginStartEndpoint)
		}
	}

	return &logoutControllerImpl{tokenRevocationService: tokenRevocationService, refreshTokenPaths: refreshTokenPaths, productionMode: systemInfoService.IsProductionMode()}
}

type logoutControllerImpl struct {
	tokenRevocationService service.TokenRevocationService
	refreshTokenPaths      []string
	productionMode         bool
}

func (l *logoutControllerImpl) Logout(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	err := l.tokenRevocationService.RevokeUserTokens(ctx, secctx.GetUserId(ctx))
	if err != nil {
		utils.RespondWithError(w, r, "Failed to perform user logout", err)
		return
	}

	utils.DeleteCookie(w, security.AccessTokenCookieName, "/", l.productionMode)

	// Clear refresh token cookie
	for _, path := range l.refreshTokenPaths {
		utils.DeleteCookie(w, security.RefreshTokenCookieName, path, l.productionMode)
	}

	w.WriteHeader(http.StatusNoContent)
}
