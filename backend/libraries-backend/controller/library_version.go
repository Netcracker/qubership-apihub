package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type LibraryVersionController interface {
	GetLibraryVersions(w http.ResponseWriter, r *http.Request)
	PostLibraryVersion(w http.ResponseWriter, r *http.Request)
	GetLibraryVersion(w http.ResponseWriter, r *http.Request)
	DeleteLibraryVersion(w http.ResponseWriter, r *http.Request)
}

func NewLibraryVersionController(
	libraryVersionService service.LibraryVersionService,
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	resp responder.Responder,
) LibraryVersionController {
	return libraryVersionControllerImpl{
		libraryVersionService: libraryVersionService,
		libraryService:        libraryService,
		authorizationService:  authorizationService,
		responder:             resp,
	}
}

type libraryVersionControllerImpl struct {
	libraryVersionService service.LibraryVersionService
	libraryService        service.LibraryService
	authorizationService  service.AuthorizationService
	responder             responder.Responder
}

func (c libraryVersionControllerImpl) GetLibraryVersions(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.ReadPermission) == nil {
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

	statuses := make([]view.VersionStatus, 0)
	for _, status := range getListQueryParam(r, "status") {
		statuses = append(statuses, view.VersionStatus(status))
	}

	versions, err := c.libraryVersionService.List(ctx, libraryId, view.LibraryVersionListReq{
		Status:     statuses,
		TextFilter: r.URL.Query().Get("textFilter"),
		Limit:      limit,
		Page:       page,
	})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library versions list", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, versions)
}

// PostLibraryVersion answers 202: the version row exists immediately, but the build that fills it with
// content runs asynchronously through the Java worker loop.
func (c libraryVersionControllerImpl) PostLibraryVersion(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	library := authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.ManageDraftVersionPermission)
	if library == nil {
		return
	}

	var req view.LibraryVersionImportReq
	if !decodeBody(w, r, c.responder, &req) {
		return
	}

	version, err := c.libraryVersionService.Import(ctx, *library, req)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to import the library version", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusAccepted, version)
}

func (c libraryVersionControllerImpl) GetLibraryVersion(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.ReadPermission) == nil {
		return
	}

	versionName, customError := unescapeVersion(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}

	version, err := c.libraryVersionService.Get(ctx, libraryId, versionName)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library version", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, version)
}

func (c libraryVersionControllerImpl) DeleteLibraryVersion(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	if authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.ManageDraftVersionPermission) == nil {
		return
	}

	versionName, customError := unescapeVersion(r)
	if customError != nil {
		c.responder.RespondWithCustomError(w, customError)
		return
	}

	if err := c.libraryVersionService.Delete(ctx, libraryId, versionName); err != nil {
		c.responder.RespondWithError(w, "Failed to delete the library version", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
