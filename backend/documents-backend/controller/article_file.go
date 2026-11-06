package controller

import (
	"io"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// ArticleFileController serves the files attached to an article (public side, article access rules apply).
type ArticleFileController interface {
	GetArticleFile(w http.ResponseWriter, r *http.Request)
}

func NewArticleFileController(articleFileService service.ArticleFileService, responder responder.Responder) ArticleFileController {
	return &articleFileControllerImpl{articleFileService: articleFileService, responder: responder}
}

type articleFileControllerImpl struct {
	articleFileService service.ArticleFileService
	responder          responder.Responder
}

// GET|HEAD /api/v1/articles/{slug}/files/{path}
func (c articleFileControllerImpl) GetArticleFile(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	file, err := c.articleFileService.GetArticleFile(ctx, getStringParam(r, "slug"), getStringParam(r, "path"))
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get article file", err)
		return
	}
	writeStoredFile(w, r, file)
}

// writeStoredFile sends a file with ETag (the checksum), conditional 304 and Cache-Control by audience.
func writeStoredFile(w http.ResponseWriter, r *http.Request, file *service.StoredFile) {
	etag := `"` + file.Checksum + `"`
	if file.Visibility == view.VisibilityPublic {
		w.Header().Set("Cache-Control", "public, max-age=3600")
	} else {
		w.Header().Set("Cache-Control", "private, no-cache")
	}
	w.Header().Set("ETag", etag)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if match := r.Header.Get("If-None-Match"); match != "" && etagMatches(match, etag) {
		w.WriteHeader(http.StatusNotModified)
		return
	}
	w.Header().Set("Content-Type", file.ContentType)
	w.Header().Set("Content-Length", strconv.FormatInt(file.Size, 10))
	w.WriteHeader(http.StatusOK)
	if r.Method != http.MethodHead {
		_, _ = w.Write(file.Data)
	}
}

func etagMatches(header, etag string) bool {
	if strings.TrimSpace(header) == "*" {
		return true
	}
	for _, candidate := range strings.Split(header, ",") {
		if strings.TrimPrefix(strings.TrimSpace(candidate), "W/") == etag {
			return true
		}
	}
	return false
}

// AdminArticleFileController: files attached to an article (sysadmin, or package permission for package articles).
type AdminArticleFileController interface {
	GetArticleFiles(w http.ResponseWriter, r *http.Request)
	UploadArticleFiles(w http.ResponseWriter, r *http.Request)
	DeleteArticleFile(w http.ResponseWriter, r *http.Request)
}

func NewAdminArticleFileController(articleFileService service.ArticleFileService, packageAccessService service.PackageAccessService, maxUploadSizeBytes int64, responder responder.Responder) AdminArticleFileController {
	return &adminArticleFileControllerImpl{articleFileService: articleFileService, packageAccessService: packageAccessService, maxUploadSizeBytes: maxUploadSizeBytes, responder: responder}
}

type adminArticleFileControllerImpl struct {
	articleFileService   service.ArticleFileService
	packageAccessService service.PackageAccessService
	maxUploadSizeBytes   int64
	responder            responder.Responder
}

// GET /api/v1/admin/articles/{id}/files
func (c adminArticleFileControllerImpl) GetArticleFiles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, c.responder, c.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	files, err := c.articleFileService.GetArticleFiles(ctx, getStringParam(r, "id"))
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get article files", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, view.ArticleFiles{Files: files})
}

// uploadedFile is one "file" part of a multipart request.
type uploadedFile struct {
	name        string
	contentType string
	data        []byte
}

func readFileParts(r *http.Request, field string) ([]uploadedFile, error) {
	if r.MultipartForm == nil {
		return nil, nil
	}
	headers := r.MultipartForm.File[field]
	files := make([]uploadedFile, 0, len(headers))
	for _, h := range headers {
		data, err := readFilePart(h)
		if err != nil {
			return nil, err
		}
		contentType := h.Header.Get("Content-Type")
		if contentType == "application/octet-stream" {
			contentType = ""
		}
		files = append(files, uploadedFile{name: h.Filename, contentType: contentType, data: data})
	}
	return files, nil
}

func readFilePart(h *multipart.FileHeader) ([]byte, error) {
	f, err := h.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()
	return io.ReadAll(f)
}

// POST /api/v1/admin/articles/{id}/files  multipart: file (required, repeatable), path (optional, single file only)
func (c adminArticleFileControllerImpl) UploadArticleFiles(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, c.responder, c.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, c.maxUploadSizeBytes*4+64*1024)
	if err := r.ParseMultipartForm(1 << 20); err != nil {
		c.responder.RespondWithCustomError(w, requestTooLarge(err, c.maxUploadSizeBytes))
		return
	}
	files, err := readFileParts(r, "file")
	if err != nil {
		c.responder.RespondWithCustomError(w, requestTooLarge(err, c.maxUploadSizeBytes))
		return
	}
	if len(files) == 0 {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "file"},
		})
		return
	}
	explicitPath := r.FormValue("path")
	if explicitPath != "" && len(files) > 1 {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameter,
			Message: exception.InvalidParameterMsg,
			Params:  map[string]interface{}{"param": "path", "reason": "can only be used with a single file"},
		})
		return
	}
	articleId := getStringParam(r, "id")
	result := make([]view.ArticleFile, 0, len(files))
	for _, f := range files {
		p := explicitPath
		if p == "" {
			p = f.name
		}
		stored, err := c.articleFileService.UploadArticleFile(ctx, articleId, p, f.contentType, f.data)
		if err != nil {
			c.responder.RespondWithError(w, r, "Failed to upload article file", err)
			return
		}
		result = append(result, *stored)
	}
	c.responder.RespondWithJson(w, http.StatusCreated, view.ArticleFiles{Files: result})
}

// DELETE /api/v1/admin/articles/{id}/files/{path}  path is relative to the article
func (c adminArticleFileControllerImpl) DeleteArticleFile(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, c.responder, c.packageAccessService.CheckArticleAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	if err := c.articleFileService.DeleteArticleFile(ctx, getStringParam(r, "id"), getStringParam(r, "path")); err != nil {
		c.responder.RespondWithError(w, r, "Failed to delete article file", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
