package controller

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// AdminArticleController: article CRUD and APIHUB relays for APIHUB system administrators; package-scoped
// operations are also open to callers with the APIHUB package permission (see service.PackageAccessService).
type AdminArticleController interface {
	GetAllArticles(w http.ResponseWriter, r *http.Request)
	CreateArticle(w http.ResponseWriter, r *http.Request)
	UpdateArticle(w http.ResponseWriter, r *http.Request)
	DeleteArticle(w http.ResponseWriter, r *http.Request)
	PublishArticle(w http.ResponseWriter, r *http.Request)
	UnpublishArticle(w http.ResponseWriter, r *http.Request)
	GetApihubPackageVersions(w http.ResponseWriter, r *http.Request)
	GetApihubVersionDocuments(w http.ResponseWriter, r *http.Request)
}

func NewAdminArticleController(articleService service.ArticleService, articleFileService service.ArticleFileService, apihubRelayService service.ApihubRelayService, packageAccessService service.PackageAccessService, maxUploadSizeBytes int64, responder responder.Responder) AdminArticleController {
	return &adminArticleControllerImpl{articleService: articleService, packageAccessService: packageAccessService, articleFileService: articleFileService, apihubRelayService: apihubRelayService, maxUploadSizeBytes: maxUploadSizeBytes, responder: responder}
}

type adminArticleControllerImpl struct {
	articleService       service.ArticleService
	articleFileService   service.ArticleFileService
	apihubRelayService   service.ApihubRelayService
	packageAccessService service.PackageAccessService
	maxUploadSizeBytes   int64
	responder            responder.Responder
}

// GET /api/v1/admin/articles?scope=&visibility=&packageId=&limit=&page=
func (a adminArticleControllerImpl) GetAllArticles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	req, customError := getArticleSearchReq(r)
	if customError != nil {
		a.responder.RespondWithCustomError(w, customError)
		return
	}
	if !authorized(w, r, a.responder, a.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	articles, err := a.articleService.GetAllArticles(ctx, req)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get articles", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, view.Articles{Articles: articles})
}

// POST /api/v1/admin/articles
// JSON body, or multipart with an "article" JSON part, an optional "markdown" file part (generic body; title,
// subtitle and slug derived from it when omitted) and repeatable "file" parts attached to the new article.
func (a adminArticleControllerImpl) CreateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		a.createArticleMultipart(w, r, ctx)
		return
	}
	var req view.ArticleRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		a.responder.RespondWithCustomError(w, customError)
		return
	}
	if !authorized(w, r, a.responder, a.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	article, err := a.articleService.CreateArticle(ctx, req)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to create article", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusCreated, article)
}

func (a adminArticleControllerImpl) createArticleMultipart(w http.ResponseWriter, r *http.Request, ctx context.Context) {
	r.Body = http.MaxBytesReader(w, r.Body, a.maxUploadSizeBytes*4+maxJsonBodySize)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		a.responder.RespondWithCustomError(w, requestTooLarge(err, a.maxUploadSizeBytes))
		return
	}
	var req view.ArticleRequest
	if raw := r.FormValue("article"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &req); err != nil {
			a.responder.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.BadRequestBody, Message: exception.BadRequestBodyMsg, Debug: err.Error()})
			return
		}
	}
	if markdownParts, err := readFileParts(r, "markdown"); err != nil {
		a.responder.RespondWithCustomError(w, requestTooLarge(err, a.maxUploadSizeBytes))
		return
	} else if len(markdownParts) > 0 {
		body := string(markdownParts[0].data)
		req.BodyMd = &body
		title, subtitle := utils.MarkdownTitleAndSubtitle(body)
		if req.Title == "" {
			req.Title = title
		}
		if req.Subtitle == "" {
			req.Subtitle = subtitle
		}
	}
	if req.Slug == "" {
		req.Slug = utils.Slugify(req.Title)
	}
	files, err := readFileParts(r, "file")
	if err != nil {
		a.responder.RespondWithCustomError(w, requestTooLarge(err, a.maxUploadSizeBytes))
		return
	}
	if !authorized(w, r, a.responder, a.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	article, err := a.articleService.CreateArticle(ctx, req)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to create article", err)
		return
	}
	for _, f := range files {
		if _, err := a.articleFileService.UploadArticleFile(ctx, article.Id, f.name, f.contentType, f.data); err != nil {
			// Keep the request atomic from the caller's point of view: drop the half-created article.
			_ = a.articleService.DeleteArticle(ctx, article.Id)
			a.responder.RespondWithError(w, r, "Failed to upload article file", err)
			return
		}
	}
	created, err := a.articleService.GetArticle(ctx, article.Slug, "")
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to read created article", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusCreated, created)
}

// PUT /api/v1/admin/articles/{id}
func (a adminArticleControllerImpl) UpdateArticle(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, a.responder, a.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	var req view.ArticleRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		a.responder.RespondWithCustomError(w, customError)
		return
	}
	// The target scope/package must be administrable too (no moving an article into a foreign package).
	if !authorized(w, r, a.responder, a.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	article, err := a.articleService.UpdateArticle(ctx, getStringParam(r, "id"), req)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to update article", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, article)
}

// DELETE /api/v1/admin/articles/{id}
func (a adminArticleControllerImpl) DeleteArticle(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, a.responder, a.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	if err := a.articleService.DeleteArticle(ctx, getStringParam(r, "id")); err != nil {
		a.responder.RespondWithError(w, r, "Failed to delete article", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/admin/articles/{id}/publish
func (a adminArticleControllerImpl) PublishArticle(w http.ResponseWriter, r *http.Request) {
	a.setPublished(w, r, true)
}

// POST /api/v1/admin/articles/{id}/unpublish
func (a adminArticleControllerImpl) UnpublishArticle(w http.ResponseWriter, r *http.Request) {
	a.setPublished(w, r, false)
}

func (a adminArticleControllerImpl) setPublished(w http.ResponseWriter, r *http.Request, published bool) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, a.responder, a.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	article, err := a.articleService.SetArticlePublished(ctx, getStringParam(r, "id"), published)
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to change article publication state", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, article)
}

// GET /api/v1/admin/apihub/packages/{packageId}/versions
func (a adminArticleControllerImpl) GetApihubPackageVersions(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, a.responder, a.packageAccessService.CheckPackageAdmin(ctx, getStringParam(r, "packageId"))) {
		return
	}
	versions, err := a.apihubRelayService.GetPackageVersions(ctx, getStringParam(r, "packageId"))
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get package versions from APIHUB", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, versions)
}

// GET /api/v1/admin/apihub/packages/{packageId}/versions/{version}/documents
func (a adminArticleControllerImpl) GetApihubVersionDocuments(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, a.responder, a.packageAccessService.CheckPackageAdmin(ctx, getStringParam(r, "packageId"))) {
		return
	}
	documents, err := a.apihubRelayService.GetVersionMarkdownDocuments(ctx, getStringParam(r, "packageId"), getStringParam(r, "version"))
	if err != nil {
		a.responder.RespondWithError(w, r, "Failed to get version documents from APIHUB", err)
		return
	}
	a.responder.RespondWithJson(w, http.StatusOK, documents)
}
