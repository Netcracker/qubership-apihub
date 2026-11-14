package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type ChangesController interface {
	GetChangesSummary(w http.ResponseWriter, r *http.Request)
	GetChanges(w http.ResponseWriter, r *http.Request)
}

func NewChangesController(
	changesService service.ChangesService,
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	resp responder.Responder,
) ChangesController {
	return changesControllerImpl{
		changesService:       changesService,
		libraryService:       libraryService,
		authorizationService: authorizationService,
		responder:            resp,
	}
}

type changesControllerImpl struct {
	changesService       service.ChangesService
	libraryService       service.LibraryService
	authorizationService service.AuthorizationService
	responder            responder.Responder
}

func (c changesControllerImpl) GetChangesSummary(w http.ResponseWriter, r *http.Request) {
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

	// A comparison may cross libraries, so reading the summary needs read access on the compared library
	// as well; otherwise its change list would leak through the counts.
	previousLibraryId := r.URL.Query().Get("previousLibraryId")
	if previousLibraryId != "" && previousLibraryId != libraryId {
		if authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, previousLibraryId, view.ReadPermission) == nil {
			return
		}
	}

	summary, err := c.changesService.GetSummary(ctx, libraryId, versionName, previousLibraryId, r.URL.Query().Get("previousVersion"))
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the version comparison summary", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, summary)
}

func (c changesControllerImpl) GetChanges(w http.ResponseWriter, r *http.Request) {
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

	previousLibraryId := r.URL.Query().Get("previousLibraryId")
	if previousLibraryId != "" && previousLibraryId != libraryId {
		if authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, previousLibraryId, view.ReadPermission) == nil {
			return
		}
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

	severities := make([]view.ChangeSeverity, 0)
	for _, severity := range getListQueryParam(r, "severity") {
		severities = append(severities, view.ChangeSeverity(severity))
	}
	changeTypes := make([]view.ChangeType, 0)
	for _, changeType := range getListQueryParam(r, "changeType") {
		changeTypes = append(changeTypes, view.ChangeType(changeType))
	}

	changes, err := c.changesService.GetChanges(ctx, libraryId, versionName, previousLibraryId,
		r.URL.Query().Get("previousVersion"), view.ChangeListReq{
			Severity:   severities,
			ChangeType: changeTypes,
			ClassId:    r.URL.Query().Get("classId"),
			Limit:      limit,
			Page:       page,
		})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the version changes", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, changes)
}
