package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
)

// HomeArticleController serves the public home page list, filtered by the caller's article visibility.
type HomeArticleController interface {
	GetHomeArticles(w http.ResponseWriter, r *http.Request)
}

func NewHomeArticleController(homeArticleService service.HomeArticleService, responder responder.Responder) HomeArticleController {
	return &homeArticleControllerImpl{homeArticleService: homeArticleService, responder: responder}
}

type homeArticleControllerImpl struct {
	homeArticleService service.HomeArticleService
	responder          responder.Responder
}

// GET /api/v1/home-articles
func (h homeArticleControllerImpl) GetHomeArticles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	articles, err := h.homeArticleService.GetHomeArticles(ctx)
	if err != nil {
		h.responder.RespondWithError(w, r, "Failed to get home articles", err)
		return
	}
	h.responder.RespondWithJson(w, http.StatusOK, articles)
}
