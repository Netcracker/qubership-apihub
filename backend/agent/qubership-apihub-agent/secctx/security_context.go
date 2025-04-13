package secctx

import (
	"net/http"
	"strings"

	"github.com/shaj13/go-guardian/v2/auth"
)

type SecurityContext interface {
	GetUserId() string
	GetUserToken() string
}

func Create(r *http.Request) SecurityContext {
	user := auth.User(r)
	userId := user.GetID()
	token := getAuthorizationToken(r)
	return &securityContextImpl{
		userId: userId,
		token:  token,
	}
}

func CreateSystemContext() SecurityContext {
	return &securityContextImpl{userId: "system", token: ""}
}

type securityContextImpl struct {
	userId string
	token  string
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
