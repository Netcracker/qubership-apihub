package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// AdminHomeArticleController: the home page list for APIHUB system administrators.
type AdminHomeArticleController interface {
	GetHomeArticles(w http.ResponseWriter, r *http.Request)
	SetHomeArticles(w http.ResponseWriter, r *http.Request)
}

func NewAdminHomeArticleController(homeArticleService service.HomeArticleService, responder responder.Responder) AdminHomeArticleController {
	return &adminHomeArticleControllerImpl{homeArticleService: homeArticleService, responder: responder}
}

type adminHomeArticleControllerImpl struct {
	homeArticleService service.HomeArticleService
	responder          responder.Responder
}

// GET /api/v1/admin/home-articles
func (h adminHomeArticleControllerImpl) GetHomeArticles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !checkSysadm(w, ctx, h.responder) {
		return
	}
	articles, err := h.homeArticleService.GetAdminHomeArticles(ctx)
	if err != nil {
		h.responder.RespondWithError(w, r, "Failed to get home articles", err)
		return
	}
	h.responder.RespondWithJson(w, http.StatusOK, articles)
}

// PUT /api/v1/admin/home-articles
func (h adminHomeArticleControllerImpl) SetHomeArticles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !checkSysadm(w, ctx, h.responder) {
		return
	}
	var req view.HomeArticlesRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		h.responder.RespondWithCustomError(w, customError)
		return
	}
	articles, err := h.homeArticleService.SetHomeArticles(ctx, req)
	if err != nil {
		h.responder.RespondWithError(w, r, "Failed to set home articles", err)
		return
	}
	h.responder.RespondWithJson(w, http.StatusOK, articles)
}
