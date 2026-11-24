package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type ContentController interface {
	GetClasses(w http.ResponseWriter, r *http.Request)
	GetClass(w http.ResponseWriter, r *http.Request)
}

func NewContentController(
	contentService service.ContentService,
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	resp responder.Responder,
) ContentController {
	return contentControllerImpl{
		contentService:       contentService,
		libraryService:       libraryService,
		authorizationService: authorizationService,
		responder:            resp,
	}
}

type contentControllerImpl struct {
	contentService       service.ContentService
	libraryService       service.LibraryService
	authorizationService service.AuthorizationService
	responder            responder.Responder
}

func (c contentControllerImpl) GetClasses(w http.ResponseWriter, r *http.Request) {
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

	kinds := make([]view.ClassKind, 0)
	for _, kind := range getListQueryParam(r, "kind") {
		kinds = append(kinds, view.ClassKind(kind))
	}

	classes, err := c.contentService.ListClasses(ctx, libraryId, versionName, view.LibraryClassListReq{
		TextFilter: r.URL.Query().Get("textFilter"),
		Kind:       kinds,
		Limit:      limit,
		Page:       page,
	})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library version classes", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, classes)
}

func (c contentControllerImpl) GetClass(w http.ResponseWriter, r *http.Request) {
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
	classId, err := getUnescapedStringParam(r, "classId")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "classId"},
			Debug:   err.Error(),
		})
		return
	}

	class, err := c.contentService.GetClass(ctx, libraryId, versionName, classId)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library class", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, class)
}
