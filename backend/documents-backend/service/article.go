package service

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/client"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/utils"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
	"github.com/go-pg/pg/v10"
)

var slugRegexp = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,127}$`)

const (
	defaultLimit = 100
	maxLimit     = 500
)

type ArticleService interface {
	// Read side: the result depends on the principal in ctx.
	GetArticles(ctx context.Context, req view.ArticleSearchReq) ([]view.Article, error)
	GetArticle(ctx context.Context, slug string, version string) (*view.Article, error)
	// VisibleArticlesQuery is the single definition of what the principal may list: it validates scope params,
	// runs the APIHUB version access check for package scope and returns the published/visibility filter (no paging).
	VisibleArticlesQuery(ctx context.Context, scope, visibility, packageId, version string) (repository.ArticleSearchQuery, error)

	// Admin side.
	GetAllArticles(ctx context.Context, req view.ArticleSearchReq) ([]view.Article, error)
	CreateArticle(ctx context.Context, req view.ArticleRequest) (*view.Article, error)
	UpdateArticle(ctx context.Context, id string, req view.ArticleRequest) (*view.Article, error)
	DeleteArticle(ctx context.Context, id string) error
	SetArticlePublished(ctx context.Context, id string, published bool) (*view.Article, error)
	// ValidatePackageRef checks in APIHUB (caller's credentials) that a package article points at a real document.
	ValidatePackageRef(ctx context.Context, ent *entity.ArticleEntity) error
}

func NewArticleService(transactionRunner repository.TransactionRunner, articleRepository repository.ArticleRepository, articleFileRepository repository.ArticleFileRepository, fileDataRepository repository.FileDataRepository, apihubClient client.ApihubClient, packageAccessCacheTtl time.Duration) ArticleService {
	return &articleServiceImpl{
		transactionRunner:     transactionRunner,
		articleRepository:     articleRepository,
		articleFileRepository: articleFileRepository,
		fileDataRepository:    fileDataRepository,
		apihubClient:          apihubClient,
		accessCache:           newTtlCache[bool](packageAccessCacheTtl),
		bodyCache:             newTtlCache[string](packageAccessCacheTtl),
	}
}

type articleServiceImpl struct {
	transactionRunner     repository.TransactionRunner
	articleRepository     repository.ArticleRepository
	articleFileRepository repository.ArticleFileRepository
	fileDataRepository    repository.FileDataRepository
	apihubClient          client.ApihubClient
	accessCache           *ttlCache[bool]
	bodyCache             *ttlCache[string]
}

func normalizePaging(req *view.ArticleSearchReq) {
	if req.Limit <= 0 {
		req.Limit = defaultLimit
	}
	if req.Limit > maxLimit {
		req.Limit = maxLimit
	}
	if req.Page < 0 {
		req.Page = 0
	}
}

func invalidParameter(param, reason string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.InvalidParameter,
		Message: exception.InvalidParameterMsg,
		Params:  map[string]interface{}{"param": param, "reason": reason},
	}
}

func articleNotFound(slug string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.ArticleNotFound,
		Message: exception.ArticleNotFoundMsg,
		Params:  map[string]interface{}{"slug": slug},
	}
}

func articleIdNotFound(id string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.ArticleIdNotFound,
		Message: exception.ArticleIdNotFoundMsg,
		Params:  map[string]interface{}{"id": id},
	}
}

// visibilitiesFor returns the visibility filter for a principal: anonymous sees public only; a requested
// visibility narrows but never widens.
func visibilitiesFor(anonymous bool, requested string) []string {
	if anonymous {
		if requested == "" || requested == view.VisibilityPublic {
			return []string{view.VisibilityPublic}
		}
		return []string{"__none__"}
	}
	if requested != "" {
		return []string{requested}
	}
	return nil
}

func (a articleServiceImpl) VisibleArticlesQuery(ctx context.Context, scope, visibility, packageId, version string) (repository.ArticleSearchQuery, error) {
	if scope == "" {
		scope = view.ScopeGeneric
	}
	if !view.ValidScope(scope) {
		return repository.ArticleSearchQuery{}, invalidParameter("scope", "must be one of: generic, package")
	}
	if visibility != "" && !view.ValidVisibility(visibility) {
		return repository.ArticleSearchQuery{}, invalidParameter("visibility", "must be one of: public, corporate")
	}
	query := repository.ArticleSearchQuery{Scope: scope, PublishedOnly: true}
	switch scope {
	case view.ScopeGeneric:
		query.Visibilities = visibilitiesFor(secctx.IsAnonymous(ctx), visibility)
	case view.ScopePackage:
		if packageId == "" || version == "" {
			return repository.ArticleSearchQuery{}, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.RequiredParamsMissing,
				Message: exception.RequiredParamsMissingMsg,
				Params:  map[string]interface{}{"params": "packageId, version"},
			}
		}
		if err := a.checkVersionAccess(ctx, packageId, version); err != nil {
			return repository.ArticleSearchQuery{}, err
		}
		query.PackageId, query.Version = packageId, version
	}
	return query, nil
}

func (a articleServiceImpl) GetArticles(ctx context.Context, req view.ArticleSearchReq) ([]view.Article, error) {
	normalizePaging(&req)
	query, err := a.VisibleArticlesQuery(ctx, req.Scope, req.Visibility, req.PackageId, req.Version)
	if err != nil {
		return nil, err
	}
	query.Limit, query.Offset = req.Limit, req.Page*req.Limit
	ents, err := a.articleRepository.GetArticles(ctx, query)
	if err != nil {
		return nil, err
	}
	files, err := a.filesOf(ctx, ents)
	if err != nil {
		return nil, err
	}
	result := make([]view.Article, 0, len(ents))
	for _, ent := range ents {
		v := entity.MakeArticleView(ent, false, false)
		if v.Scope == view.ScopePackage && v.Version == "" {
			v.Version = req.Version
		}
		v.Files = files[ent.Id]
		result = append(result, v)
	}
	return result, nil
}

// filesOf loads the attached files of the given articles as public projections (never nil slices).
func (a articleServiceImpl) filesOf(ctx context.Context, ents []entity.ArticleEntity) (map[string][]view.ArticleFile, error) {
	ids := make([]string, 0, len(ents))
	for _, ent := range ents {
		ids = append(ids, ent.Id)
	}
	byArticle, err := a.articleFileRepository.GetArticleFiles(ctx, ids)
	if err != nil {
		return nil, err
	}
	result := make(map[string][]view.ArticleFile, len(ents))
	for _, ent := range ents {
		files := make([]view.ArticleFile, 0, len(byArticle[ent.Id]))
		for _, f := range byArticle[ent.Id] {
			files = append(files, entity.MakeArticleFileView(f, false))
		}
		result[ent.Id] = files
	}
	return result, nil
}

// checkVersionAccess asks APIHUB whether the caller may read the version; any non-200 answer is reported as 404.
func (a articleServiceImpl) checkVersionAccess(ctx context.Context, packageId, version string) error {
	key := secctx.PrincipalKey(ctx) + "|" + packageId + "|" + version
	if ok, hit := a.accessCache.Get(key); hit && ok {
		return nil
	}
	if _, err := a.apihubClient.GetVersion(ctx, secctx.GetCredential(ctx), packageId, version); err != nil {
		return mapApihubReadError(err, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageVersionNotAccessible,
			Message: exception.PackageVersionNotAccessibleMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": version},
		})
	}
	a.accessCache.Put(key, true)
	return nil
}

func mapApihubReadError(err error, notFound *exception.CustomError) error {
	switch {
	case errors.Is(err, client.ErrNotFound), errors.Is(err, client.ErrUnauthorized), errors.Is(err, client.ErrForbidden):
		return notFound
	case errors.Is(err, client.ErrUnavailable):
		return apihubUnavailable(err)
	default:
		return err
	}
}

func apihubUnavailable(err error) error {
	return &exception.CustomError{
		Status:  http.StatusBadGateway,
		Code:    exception.ApihubUnavailable,
		Message: exception.ApihubUnavailableMsg,
		Debug:   err.Error(),
	}
}

func (a articleServiceImpl) GetArticle(ctx context.Context, slug string, version string) (*view.Article, error) {
	ent, err := a.articleRepository.GetArticleBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, articleNotFound(slug)
	}
	admin := secctx.IsPackageAdmin(ctx, derefString(ent.PackageId))
	if !ent.Published && !admin {
		return nil, articleNotFound(slug)
	}
	files, err := a.filesOf(ctx, []entity.ArticleEntity{*ent})
	if err != nil {
		return nil, err
	}
	switch ent.Scope {
	case view.ScopeGeneric:
		if ent.Visibility != nil && *ent.Visibility == view.VisibilityCorporate && secctx.IsAnonymous(ctx) {
			return nil, articleNotFound(slug)
		}
		v := entity.MakeArticleView(*ent, true, admin)
		v.Files = files[ent.Id]
		return &v, nil
	case view.ScopePackage:
		effectiveVersion := version
		if ent.Version != nil && *ent.Version != "" {
			effectiveVersion = *ent.Version
		}
		if effectiveVersion == "" {
			return nil, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.VersionQueryRequired,
				Message: exception.VersionQueryRequiredMsg,
				Params:  map[string]interface{}{"slug": slug, "packageId": *ent.PackageId},
			}
		}
		body, err := a.getPackageDocumentBody(ctx, *ent.PackageId, effectiveVersion, *ent.DocumentSlug)
		if err != nil {
			return nil, err
		}
		v := entity.MakeArticleView(*ent, false, admin)
		v.Version = effectiveVersion
		v.BodyMd = &body
		v.Files = files[ent.Id]
		return &v, nil
	}
	return nil, fmt.Errorf("unknown scope %q for article %s", ent.Scope, slug)
}

func (a articleServiceImpl) getPackageDocumentBody(ctx context.Context, packageId, version, documentSlug string) (string, error) {
	key := secctx.PrincipalKey(ctx) + "|" + packageId + "|" + version + "|" + documentSlug
	if body, hit := a.bodyCache.Get(key); hit {
		return body, nil
	}
	data, _, err := a.apihubClient.GetVersionFileRaw(ctx, secctx.GetCredential(ctx), packageId, version, documentSlug)
	if err != nil {
		return "", mapApihubReadError(err, &exception.CustomError{
			Status:  http.StatusNotFound,
			Code:    exception.PackageDocumentNotAccessible,
			Message: exception.PackageDocumentNotAccessibleMsg,
			Params:  map[string]interface{}{"packageId": packageId, "version": version, "documentSlug": documentSlug},
		})
	}
	body := string(data)
	a.bodyCache.Put(key, body)
	return body, nil
}

// ---- admin ----

func (a articleServiceImpl) GetAllArticles(ctx context.Context, req view.ArticleSearchReq) ([]view.Article, error) {
	normalizePaging(&req)
	if req.Scope != "" && !view.ValidScope(req.Scope) {
		return nil, invalidParameter("scope", "must be one of: generic, package")
	}
	query := repository.ArticleSearchQuery{Scope: req.Scope, PackageId: req.PackageId, Limit: req.Limit, Offset: req.Page * req.Limit}
	if req.Visibility != "" {
		query.Visibilities = []string{req.Visibility}
	}
	ents, err := a.articleRepository.GetArticles(ctx, query)
	if err != nil {
		return nil, err
	}
	files, err := a.filesOf(ctx, ents)
	if err != nil {
		return nil, err
	}
	result := make([]view.Article, 0, len(ents))
	for _, ent := range ents {
		v := entity.MakeArticleView(ent, false, true)
		v.Files = files[ent.Id]
		result = append(result, v)
	}
	return result, nil
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func articleValidationFailed(reason string) error {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.ArticleValidationFailed,
		Message: exception.ArticleValidationFailedMsg,
		Params:  map[string]interface{}{"reason": reason},
	}
}

// MakeArticleEntity validates the request and produces a row (shared with import).
func MakeArticleEntity(req view.ArticleRequest) (*entity.ArticleEntity, error) {
	req.Slug = strings.TrimSpace(req.Slug)
	if !slugRegexp.MatchString(req.Slug) {
		return nil, articleValidationFailed("slug must match " + slugRegexp.String())
	}
	if strings.TrimSpace(req.Title) == "" {
		return nil, articleValidationFailed("title is required")
	}
	if !view.ValidScope(req.Scope) {
		return nil, articleValidationFailed("scope must be one of: generic, package")
	}
	labels := req.Labels
	if labels == nil {
		labels = []string{}
	}
	ent := &entity.ArticleEntity{
		Slug:         req.Slug,
		Title:        strings.TrimSpace(req.Title),
		Subtitle:     strings.TrimSpace(req.Subtitle),
		Scope:        req.Scope,
		Labels:       labels,
		DisplayOrder: req.DisplayOrder,
		Published:    req.Published,
	}
	switch req.Scope {
	case view.ScopeGeneric:
		if req.BodyMd == nil {
			return nil, articleValidationFailed("bodyMd is required for generic articles")
		}
		if !view.ValidVisibility(req.Visibility) {
			return nil, articleValidationFailed("visibility must be one of: public, corporate")
		}
		if req.PackageId != "" || req.Version != "" || req.DocumentSlug != "" {
			return nil, articleValidationFailed("packageId, version and documentSlug are not allowed for generic articles")
		}
		ent.BodyMd = req.BodyMd
		ent.Visibility = strPtr(req.Visibility)
	case view.ScopePackage:
		if req.PackageId == "" || req.DocumentSlug == "" {
			return nil, articleValidationFailed("packageId and documentSlug are required for package articles")
		}
		if req.BodyMd != nil || req.Visibility != "" {
			return nil, articleValidationFailed("bodyMd and visibility are not allowed for package articles")
		}
		ent.PackageId = strPtr(req.PackageId)
		ent.Version = strPtr(req.Version)
		ent.DocumentSlug = strPtr(req.DocumentSlug)
	}
	return ent, nil
}

func (a articleServiceImpl) ValidatePackageRef(ctx context.Context, ent *entity.ArticleEntity) error {
	if ent.Scope != view.ScopePackage {
		return nil
	}
	cred := secctx.GetCredential(ctx)
	version := ""
	if ent.Version != nil {
		version = *ent.Version
	}
	if version == "" {
		// Applies to every version: the package must be reachable; the document is checked in the latest version.
		versions, err := a.apihubClient.GetVersions(ctx, cred, *ent.PackageId)
		if err != nil {
			return packageRefError(err, fmt.Sprintf("package '%s'", *ent.PackageId))
		}
		if len(versions.Versions) == 0 {
			return packageRefError(client.ErrNotFound, fmt.Sprintf("a published version of package '%s'", *ent.PackageId))
		}
		version = versions.Versions[0].Version
	} else if _, err := a.apihubClient.GetVersion(ctx, cred, *ent.PackageId, version); err != nil {
		return packageRefError(err, fmt.Sprintf("version '%s' of package '%s'", version, *ent.PackageId))
	}
	if _, err := a.apihubClient.GetVersionDocument(ctx, cred, *ent.PackageId, version, *ent.DocumentSlug); err != nil {
		return packageRefError(err, fmt.Sprintf("document '%s' in version '%s' of package '%s'", *ent.DocumentSlug, version, *ent.PackageId))
	}
	return nil
}

func packageRefError(err error, what string) error {
	switch {
	case errors.Is(err, client.ErrNotFound), errors.Is(err, client.ErrForbidden), errors.Is(err, client.ErrUnauthorized):
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.PackageRefNotFound,
			Message: exception.PackageRefNotFoundMsg,
			Params:  map[string]interface{}{"what": what},
		}
	case errors.Is(err, client.ErrUnavailable):
		return apihubUnavailable(err)
	default:
		return err
	}
}

func slugAlreadyExists(slug string) error {
	return &exception.CustomError{
		Status:  http.StatusConflict,
		Code:    exception.ArticleSlugAlreadyExists,
		Message: exception.ArticleSlugAlreadyExistsMsg,
		Params:  map[string]interface{}{"slug": slug},
	}
}

func (a articleServiceImpl) CreateArticle(ctx context.Context, req view.ArticleRequest) (*view.Article, error) {
	ent, err := MakeArticleEntity(req)
	if err != nil {
		return nil, err
	}
	existing, err := a.articleRepository.GetArticleBySlug(ctx, ent.Slug)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, slugAlreadyExists(ent.Slug)
	}
	if err := a.ValidatePackageRef(ctx, ent); err != nil {
		return nil, err
	}
	now := time.Now()
	userId := secctx.GetUserId(ctx)
	ent.Id = utils.NewId()
	ent.CreatedAt, ent.UpdatedAt, ent.CreatedBy, ent.UpdatedBy = now, now, userId, userId
	if err := a.articleRepository.CreateArticle(ctx, ent); err != nil {
		return nil, err
	}
	v := entity.MakeArticleView(*ent, true, true)
	v.Files = []view.ArticleFile{}
	return &v, nil
}

func (a articleServiceImpl) UpdateArticle(ctx context.Context, id string, req view.ArticleRequest) (*view.Article, error) {
	existing, err := a.articleRepository.GetArticleById(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, articleIdNotFound(id)
	}
	ent, err := MakeArticleEntity(req)
	if err != nil {
		return nil, err
	}
	if ent.Slug != existing.Slug {
		// Slugs are immutable: the UI and Markdown bodies link articles and their files by slug.
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ArticleSlugImmutable,
			Message: exception.ArticleSlugImmutableMsg,
			Params:  map[string]interface{}{"slug": existing.Slug},
		}
	}
	if err := a.ValidatePackageRef(ctx, ent); err != nil {
		return nil, err
	}
	ent.Id = existing.Id
	ent.CreatedAt, ent.CreatedBy = existing.CreatedAt, existing.CreatedBy
	ent.UpdatedAt, ent.UpdatedBy = time.Now(), secctx.GetUserId(ctx)
	if err := a.articleRepository.UpdateArticle(ctx, ent); err != nil {
		return nil, err
	}
	files, err := a.filesOf(ctx, []entity.ArticleEntity{*ent})
	if err != nil {
		return nil, err
	}
	v := entity.MakeArticleView(*ent, true, true)
	v.Files = files[ent.Id]
	return &v, nil
}

// ArticleFilesVisibility is the audience of an article's files, derived from the article at serve time: public only
// for generic public articles, corporate otherwise (package articles are authorized by APIHUB, so their files are
// never public).
func ArticleFilesVisibility(ent *entity.ArticleEntity) string {
	if ent.Scope == view.ScopeGeneric && ent.Visibility != nil && *ent.Visibility == view.VisibilityPublic {
		return view.VisibilityPublic
	}
	return view.VisibilityCorporate
}

func (a articleServiceImpl) DeleteArticle(ctx context.Context, id string) error {
	existing, err := a.articleRepository.GetArticleById(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return articleIdNotFound(id)
	}
	// The FK cascades the metadata too; deleting explicitly keeps the behaviour visible and lets the shared file
	// contents be garbage-collected in the same transaction.
	return a.transactionRunner.RunInTransaction(ctx, func(tx *pg.Tx) error {
		deleted, err := a.articleFileRepository.DeleteArticleFiles(ctx, tx, id)
		if err != nil {
			return err
		}
		if err := a.articleRepository.DeleteArticle(ctx, tx, id); err != nil {
			return err
		}
		return a.fileDataRepository.DeleteOrphanFileData(ctx, tx, checksumsOf(deleted))
	})
}

func (a articleServiceImpl) SetArticlePublished(ctx context.Context, id string, published bool) (*view.Article, error) {
	ent, err := a.articleRepository.SetArticlePublished(ctx, id, published, secctx.GetUserId(ctx))
	if err != nil {
		return nil, err
	}
	if ent == nil {
		return nil, articleIdNotFound(id)
	}
	v := entity.MakeArticleView(*ent, false, true)
	return &v, nil
}
