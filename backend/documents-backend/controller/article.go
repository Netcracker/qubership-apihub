package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// ArticleController serves the read side: what the caller sees depends on the principal (anonymous / user / admin).
type ArticleController interface {
	GetArticles(w http.ResponseWriter, r *http.Request)
	GetArticle(w http.ResponseWriter, r *http.Request)
}

func NewArticleController(articleService service.ArticleService, responder responder.Responder) ArticleController {
	return &articleControllerImpl{articleService: articleService, responder: responder}
}

type articleControllerImpl struct {
	articleService service.ArticleService
	responder      responder.Responder
}

// GET /api/v1/articles?scope=generic|package&visibility=&packageId=&version=&limit=&page=
func (a articleControllerImpl) GetArticles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	req, customError := getArticleSearchReq(r)
	if customError != nil {
		a.responder.RespondWithCustomError(w, customError)
		return
	}
	articles, err := a.articleService.GetArticles(ctx, req)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get articles", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, view.Articles{Articles: articles})
}

// GET /api/v1/articles/{slug}?version=
func (a articleControllerImpl) GetArticle(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	article, err := a.articleService.GetArticle(ctx, getStringParam(r, "slug"), r.URL.Query().Get("version"))
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get article", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, article)
}
