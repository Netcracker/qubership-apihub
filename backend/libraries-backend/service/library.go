package service

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"time"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/repository"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
	"github.com/go-pg/pg/v10"
)

type LibraryService interface {
	Create(ctx context.Context, req view.LibraryCreateReq) (*view.Library, error)
	Get(ctx context.Context, libraryId string) (*view.Library, error)
	// GetEntity returns the stored row for callers that need it before a permission check, which cannot
	// run without knowing the library's parent package and default role.
	GetEntity(ctx context.Context, libraryId string) (*entity.LibraryEntity, error)
	Update(ctx context.Context, libraryId string, req view.LibraryUpdateReq) (*view.Library, error)
	Delete(ctx context.Context, libraryId string) error
	List(ctx context.Context, req view.LibraryListReq) (*view.Libraries, error)
	ListFavorites(ctx context.Context, limit, page int) (*view.Libraries, error)
	Favor(ctx context.Context, libraryId string) error
	Disfavor(ctx context.Context, libraryId string) error
	Search(ctx context.Context, req view.SearchLibrariesReq) (*view.SearchLibrariesResult, error)
}

func NewLibraryService(
	libraryRepository repository.LibraryRepository,
	memberRepository repository.MemberRepository,
	registryService RegistryService,
) LibraryService {
	return libraryServiceImpl{
		libraryRepository: libraryRepository,
		memberRepository:  memberRepository,
		registryService:   registryService,
	}
}

type libraryServiceImpl struct {
	libraryRepository repository.LibraryRepository
	memberRepository  repository.MemberRepository
	registryService   RegistryService
}

const (
	maxAliasLength = 10
	// libraryIdSeparator joins the parent package id and the alias, the same way portal-backend composes
	// a package id.
	libraryIdSeparator = "."
)

var aliasPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)

// makeLibraryId composes the human-readable library id: the parent package id (the group) followed by the
// alias. A library without a parent package is identified by its alias alone.
func makeLibraryId(parentPackageId, alias string) string {
	if parentPackageId == "" {
		return alias
	}
	return parentPackageId + libraryIdSeparator + alias
}

func (l libraryServiceImpl) Create(ctx context.Context, req view.LibraryCreateReq) (*view.Library, error) {
	if !req.Language.Valid() {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": req.Language, "param": "language"},
		}
	}

	if len(req.Alias) == 0 || len(req.Alias) > maxAliasLength || !aliasPattern.MatchString(req.Alias) {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": req.Alias, "param": "alias"},
		}
	}

	coordinatesKey, err := req.Coordinates.CoordinatesKey(req.Language)
	if err != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidCoordinates,
			Message: exception.InvalidCoordinatesMsg,
			Params:  map[string]interface{}{"language": req.Language, "details": err.Error()},
		}
	}

	repositoryExists, err := l.registryService.RepositoryExists(ctx, req.Repository)
	if err != nil {
		return nil, err
	}
	if !repositoryExists {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RepositoryNotFound,
			Message: exception.RepositoryNotFoundMsg,
			Params:  map[string]interface{}{"repository": req.Repository},
		}
	}

	existing, err := l.libraryRepository.GetByCoordinates(ctx, req.Repository, coordinatesKey)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.LibraryAlreadyExists,
			Message: exception.LibraryAlreadyExistsMsg,
			Params:  map[string]interface{}{"libraryId": existing.Id},
		}
	}

	libraryId := makeLibraryId(req.ParentPackageId, req.Alias)
	// The id must be free even among soft-deleted rows, which keep their primary key.
	idTaken, err := l.libraryRepository.ExistsById(ctx, libraryId)
	if err != nil {
		return nil, err
	}
	if idTaken {
		return nil, &exception.CustomError{
			Status:  http.StatusConflict,
			Code:    exception.LibraryIdAlreadyExists,
			Message: exception.LibraryIdAlreadyExistsMsg,
			Params:  map[string]interface{}{"libraryId": libraryId},
		}
	}

	coordinates, err := entity.CoordinatesMap(req.Coordinates)
	if err != nil {
		return nil, fmt.Errorf("failed to encode the coordinates: %w", err)
	}

	defaultRole := req.DefaultRole
	if defaultRole == "" {
		defaultRole = view.DefaultLibraryRole
	}

	// The id is derived from the parent package id and the alias, so alias is immutable after creation.
	library := entity.LibraryEntity{
		Id:              libraryId,
		Alias:           req.Alias,
		Name:            req.Name,
		Description:     req.Description,
		Language:        string(req.Language),
		Repository:      req.Repository,
		ParentPackageId: req.ParentPackageId,
		Coordinates:     coordinates,
		CoordinatesKey:  coordinatesKey,
		DefaultRole:     defaultRole,
		CreatedAt:       time.Now(),
		CreatedBy:       secctx.GetUserId(ctx),
	}

	if err := l.libraryRepository.Create(ctx, library); err != nil {
		return nil, err
	}

	result := entity.MakeLibraryView(library, false)
	return &result, nil
}

func (l libraryServiceImpl) GetEntity(ctx context.Context, libraryId string) (*entity.LibraryEntity, error) {
	library, err := l.libraryRepository.GetById(ctx, libraryId)
	if err != nil {
		return nil, err
	}
	if library == nil {
		return nil, libraryNotFound(libraryId)
	}
	return library, nil
}

func (l libraryServiceImpl) Get(ctx context.Context, libraryId string) (*view.Library, error) {
	library, err := l.GetEntity(ctx, libraryId)
	if err != nil {
		return nil, err
	}
	isFavorite, err := l.libraryRepository.IsFavorite(ctx, secctx.GetUserId(ctx), libraryId)
	if err != nil {
		return nil, err
	}
	result := entity.MakeLibraryView(*library, isFavorite)
	return &result, nil
}

func (l libraryServiceImpl) Update(ctx context.Context, libraryId string, req view.LibraryUpdateReq) (*view.Library, error) {
	library, err := l.GetEntity(ctx, libraryId)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		library.Name = *req.Name
	}
	if req.Description != nil {
		library.Description = *req.Description
	}
	if req.DefaultRole != nil {
		library.DefaultRole = *req.DefaultRole
	}

	if err := l.libraryRepository.Update(ctx, *library); err != nil {
		if err == pg.ErrNoRows {
			return nil, libraryNotFound(libraryId)
		}
		return nil, err
	}

	isFavorite, err := l.libraryRepository.IsFavorite(ctx, secctx.GetUserId(ctx), libraryId)
	if err != nil {
		return nil, err
	}
	result := entity.MakeLibraryView(*library, isFavorite)
	return &result, nil
}

func (l libraryServiceImpl) Delete(ctx context.Context, libraryId string) error {
	err := l.libraryRepository.SoftDelete(ctx, libraryId, secctx.GetUserId(ctx))
	if err == pg.ErrNoRows {
		return libraryNotFound(libraryId)
	}
	return err
}

func (l libraryServiceImpl) List(ctx context.Context, req view.LibraryListReq) (*view.Libraries, error) {
	if req.Language != "" && !req.Language.Valid() {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": req.Language, "param": "language"},
		}
	}

	ents, err := l.libraryRepository.List(ctx, secctx.GetUserId(ctx), req)
	if err != nil {
		return nil, err
	}
	result := view.Libraries{Libraries: make([]view.Library, 0, len(ents))}
	for _, ent := range ents {
		result.Libraries = append(result.Libraries, entity.MakeLibraryView(ent.LibraryEntity, ent.IsFavorite))
	}
	return &result, nil
}

func (l libraryServiceImpl) ListFavorites(ctx context.Context, limit, page int) (*view.Libraries, error) {
	ents, err := l.libraryRepository.ListFavorites(ctx, secctx.GetUserId(ctx), limit, page)
	if err != nil {
		return nil, err
	}
	result := view.Libraries{Libraries: make([]view.Library, 0, len(ents))}
	for _, ent := range ents {
		result.Libraries = append(result.Libraries, entity.MakeLibraryView(ent, true))
	}
	return &result, nil
}

func (l libraryServiceImpl) Favor(ctx context.Context, libraryId string) error {
	if _, err := l.GetEntity(ctx, libraryId); err != nil {
		return err
	}
	return l.memberRepository.AddFavorite(ctx, secctx.GetUserId(ctx), libraryId)
}

func (l libraryServiceImpl) Disfavor(ctx context.Context, libraryId string) error {
	if _, err := l.GetEntity(ctx, libraryId); err != nil {
		return err
	}
	return l.memberRepository.RemoveFavorite(ctx, secctx.GetUserId(ctx), libraryId)
}

func (l libraryServiceImpl) Search(ctx context.Context, req view.SearchLibrariesReq) (*view.SearchLibrariesResult, error) {
	if req.Language != "" && !req.Language.Valid() {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidParameterValue,
			Message: exception.InvalidParameterValueMsg,
			Params:  map[string]interface{}{"value": req.Language, "param": "language"},
		}
	}

	ents, err := l.libraryRepository.Search(ctx, req)
	if err != nil {
		return nil, err
	}
	result := view.SearchLibrariesResult{Libraries: make([]view.SearchResultLibrary, 0, len(ents))}
	for _, ent := range ents {
		result.Libraries = append(result.Libraries, entity.MakeLibrarySearchResultView(ent))
	}
	return &result, nil
}

func libraryNotFound(libraryId string) error {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.LibraryNotFound,
		Message: exception.LibraryNotFoundMsg,
		Params:  map[string]interface{}{"libraryId": libraryId},
	}
}
