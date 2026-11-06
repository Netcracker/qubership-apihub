package controller

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/gorilla/mux"
)

const maxJsonBodySize = 8 << 20

func getStringParam(r *http.Request, p string) string {
	params := mux.Vars(r)
	return params[p]
}

func getIntQueryParam(r *http.Request, p string, defaultValue int) (int, *exception.CustomError) {
	raw := r.URL.Query().Get(p)
	if raw == "" {
		return defaultValue, nil
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value < 0 {
		return 0, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.IncorrectParamType,
			Message: exception.IncorrectParamTypeMsg,
			Params:  map[string]interface{}{"param": p, "type": "non-negative int"},
		}
	}
	return value, nil
}

func getArticleSearchReq(r *http.Request) (view.ArticleSearchReq, *exception.CustomError) {
	limit, customError := getIntQueryParam(r, "limit", 0)
	if customError != nil {
		return view.ArticleSearchReq{}, customError
	}
	page, customError := getIntQueryParam(r, "page", 0)
	if customError != nil {
		return view.ArticleSearchReq{}, customError
	}
	q := r.URL.Query()
	return view.ArticleSearchReq{
		Scope:      q.Get("scope"),
		Visibility: q.Get("visibility"),
		PackageId:  q.Get("packageId"),
		Version:    q.Get("version"),
		Limit:      limit,
		Page:       page,
	}, nil
}

func decodeJsonBody(r *http.Request, out interface{}) *exception.CustomError {
	defer r.Body.Close()
	body, err := io.ReadAll(io.LimitReader(r.Body, maxJsonBodySize))
	if err != nil {
		return &exception.CustomError{Status: http.StatusBadRequest, Code: exception.BadRequestBody, Message: exception.BadRequestBodyMsg, Debug: err.Error()}
	}
	if err := json.Unmarshal(body, out); err != nil {
		return &exception.CustomError{Status: http.StatusBadRequest, Code: exception.BadRequestBody, Message: exception.BadRequestBodyMsg, Debug: err.Error()}
	}
	return nil
}

// checkSysadm answers 403 and returns false when the caller is not an APIHUB system administrator.
func checkSysadm(w http.ResponseWriter, ctx context.Context, resp responder.Responder) bool {
	if secctx.IsSysadm(ctx) {
		return true
	}
	resp.RespondWithCustomError(w, &exception.CustomError{
		Status:  http.StatusForbidden,
		Code:    exception.InsufficientPrivileges,
		Message: exception.InsufficientPrivilegesMsg,
	})
	return false
}

// authorized answers the access error (403/401/404/502) and returns false when err is not nil.
func authorized(w http.ResponseWriter, r *http.Request, resp responder.Responder, err error) bool {
	if err == nil {
		return true
	}
	resp.RespondWithError(w, r, "Access denied", err)
	return false
}

func requestTooLarge(err error, maxSize int64) *exception.CustomError {
	if _, ok := err.(*http.MaxBytesError); ok {
		return &exception.CustomError{
			Status:  http.StatusRequestEntityTooLarge,
			Code:    exception.ArticleFileTooLarge,
			Message: exception.ArticleFileTooLargeMsg,
			Params:  map[string]interface{}{"maxSize": maxSize},
		}
	}
	return &exception.CustomError{Status: http.StatusBadRequest, Code: exception.BadRequestBody, Message: exception.BadRequestBodyMsg, Debug: err.Error()}
}
