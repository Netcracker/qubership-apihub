package controller

import (
	"context"
	"encoding/json"
	"io"
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/entity"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryController interface {
	GetLibraries(w http.ResponseWriter, r *http.Request)
	PostLibrary(w http.ResponseWriter, r *http.Request)
	GetLibrary(w http.ResponseWriter, r *http.Request)
	PatchLibrary(w http.ResponseWriter, r *http.Request)
	DeleteLibrary(w http.ResponseWriter, r *http.Request)

	GetFavoriteLibraries(w http.ResponseWriter, r *http.Request)
	PutFavoriteLibrary(w http.ResponseWriter, r *http.Request)
	DeleteFavoriteLibrary(w http.ResponseWriter, r *http.Request)

	SearchLibraries(w http.ResponseWriter, r *http.Request)
}

func NewLibraryController(
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	resp responder.Responder,
) LibraryController {
	return libraryControllerImpl{
		libraryService:       libraryService,
		authorizationService: authorizationService,
		responder:            resp,
	}
}

type libraryControllerImpl struct {
	libraryService       service.LibraryService
	authorizationService service.AuthorizationService
	responder            responder.Responder
}

// authorize loads the library and checks one permission on it in a single step, because the check needs the
// library's parent package and default role. It writes the response itself when the caller may not proceed,
// and then returns nil.
func authorize(
	ctx context.Context,
	w http.ResponseWriter,
	resp responder.Responder,
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	libraryId string,
	permission view.RolePermission,
) *entity.LibraryEntity {
	library, err := libraryService.GetEntity(ctx, libraryId)
	if err != nil {
		resp.RespondWithError(w, "Failed to get the library", err)
		return nil
	}

	sufficientPrivileges, err := authorizationService.HasLibraryPermission(ctx, *library, permission)
	if err != nil {
		resp.RespondWithError(w, "Failed to check user privileges", err)
		return nil
	}
	if !sufficientPrivileges {
		resp.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return nil
	}
	return library
}

func (c libraryControllerImpl) authorize(ctx context.Context, w http.ResponseWriter, libraryId string, permission view.RolePermission) *entity.LibraryEntity {
	return authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, permission)
}

func (c libraryControllerImpl) GetLibraries(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}
	page, customError := getPageQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}
	onlyFavorite, customError := getBoolQueryParam(r, "onlyFavorite")
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}

	libraries, err := c.libraryService.List(ctx, view.LibraryListReq{
		Repository:      r.URL.Query().Get("repository"),
		Language:        view.Language(r.URL.Query().Get("language")),
		ParentPackageId: r.URL.Query().Get("parentPackageId"),
		TextFilter:      r.URL.Query().Get("textFilter"),
		OnlyFavorite:    onlyFavorite,
		Limit:           limit,
		Page:            page,
	})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the libraries list", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, libraries)
}

func (c libraryControllerImpl) PostLibrary(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := secctx.MakeUserContext(r)

	var req view.LibraryCreateReq
	if !decodeBody(w, r, c.responder, &req) {
		return
	}

	sufficientPrivileges, err := c.authorizationService.CanCreateLibrary(ctx, req.ParentPackageId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to check user privileges", err)
		return
	}
	if !sufficientPrivileges {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusForbidden,
			Code:    exception.InsufficientPrivileges,
			Message: exception.InsufficientPrivilegesMsg,
		})
		return
	}

	library, err := c.libraryService.Create(ctx, req)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to create the library", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusCreated, library)
}

func (c libraryControllerImpl) GetLibrary(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if c.authorize(ctx, w, libraryId, view.ReadPermission) == nil {
		return
	}

	library, err := c.libraryService.Get(ctx, libraryId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, library)
}

func (c libraryControllerImpl) PatchLibrary(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if c.authorize(ctx, w, libraryId, view.CreateAndUpdatePackagePermission) == nil {
		return
	}

	var req view.LibraryUpdateReq
	if !decodeBody(w, r, c.responder, &req) {
		return
	}

	library, err := c.libraryService.Update(ctx, libraryId, req)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to update the library", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, library)
}

func (c libraryControllerImpl) DeleteLibrary(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if c.authorize(ctx, w, libraryId, view.DeletePackagePermission) == nil {
		return
	}

	if err := c.libraryService.Delete(ctx, libraryId); err != nil {
		c.responder.RespondWithError(w, "Failed to delete the library", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c libraryControllerImpl) GetFavoriteLibraries(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}
	page, customError := getPageQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}

	libraries, err := c.libraryService.ListFavorites(ctx, limit, page)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the favorite libraries", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, libraries)
}

func (c libraryControllerImpl) PutFavoriteLibrary(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	// Favoring is the caller's own bookmark, so reading the library is privilege enough.
	if c.authorize(ctx, w, libraryId, view.ReadPermission) == nil {
		return
	}

	if err := c.libraryService.Favor(ctx, libraryId); err != nil {
		c.responder.RespondWithError(w, "Failed to favor the library", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c libraryControllerImpl) DeleteFavoriteLibrary(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if c.authorize(ctx, w, libraryId, view.ReadPermission) == nil {
		return
	}

	if err := c.libraryService.Disfavor(ctx, libraryId); err != nil {
		c.responder.RespondWithError(w, "Failed to unfavor the library", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c libraryControllerImpl) SearchLibraries(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)

	textFilter := r.URL.Query().Get("textFilter")
	if textFilter == "" {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "textFilter"},
		})
		return
	}

	limit, customError := getLimitQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}
	page, customError := getPageQueryParam(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}

	result, err := c.libraryService.Search(ctx, view.SearchLibrariesReq{
		TextFilter: textFilter,
		Language:   view.Language(r.URL.Query().Get("language")),
		Repository: r.URL.Query().Get("repository"),
		Limit:      limit,
		Page:       page,
	})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to search the libraries", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}

// decodeBody reads a JSON request body, answering the caller itself when the body cannot be parsed. It
// reports whether the handler may continue.
func decodeBody(w http.ResponseWriter, r *http.Request, resp responder.Responder, target interface{}) bool {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		resp.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return false
	}
	if err := json.Unmarshal(body, target); err != nil {
		resp.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return false
	}
	return true
}
