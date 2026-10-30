package secctx

import (
	"net/http"
	"strings"

	"github.com/shaj13/go-guardian/v2/auth"
)

const SystemRoleExt = "systemRole"

type SecurityContext interface {
	GetUserId() string
	GetUserToken() string
	IsSysadm() bool
}

func Create(r *http.Request) SecurityContext {
	user := auth.User(r)
	userId := user.GetID()
	token := getAuthorizationToken(r)
	sysRoles := user.GetExtensions().Values(SystemRoleExt)
	return &securityContextImpl{
		userId:      userId,
		token:       token,
		systemRoles: sysRoles,
	}
}

func CreateSystemContext() SecurityContext {
	return &securityContextImpl{userId: "system", token: ""}
}

type securityContextImpl struct {
	userId      string
	token       string
	systemRoles []string
}

func getAuthorizationToken(r *http.Request) string {
	authorizationHeaderValue := r.Header.Get("authorization")
	return strings.ReplaceAll(authorizationHeaderValue, "Bearer ", "")
}

func (ctx securityContextImpl) GetUserId() string {
	return ctx.userId
}
func (ctx securityContextImpl) GetUserToken() string {
	return ctx.token
}

func (ctx securityContextImpl) IsSysadm() bool {
	for _, role := range ctx.systemRoles {
		if role == "System administrator" {
			return true
		}
	}
	return false
}
