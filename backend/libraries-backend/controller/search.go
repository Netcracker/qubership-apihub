package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type SearchController interface {
	SearchClasses(w http.ResponseWriter, r *http.Request)
}

func NewSearchController(searchService service.SearchService, resp responder.Responder) SearchController {
	return searchControllerImpl{
		searchService: searchService,
		responder:     resp,
	}
}

type searchControllerImpl struct {
	searchService service.SearchService
	responder     responder.Responder
}

func (c searchControllerImpl) SearchClasses(w http.ResponseWriter, r *http.Request) {
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

	libraryId := r.URL.Query().Get("libraryId")
	versionName := r.URL.Query().Get("version")
	if versionName != "" && libraryId == "" {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "libraryId"},
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

	kinds := make([]view.ClassKind, 0)
	for _, kind := range getListQueryParam(r, "kind") {
		kinds = append(kinds, view.ClassKind(kind))
	}

	result, err := c.searchService.SearchClasses(ctx, view.SearchClassesReq{
		TextFilter: textFilter,
		LibraryId:  libraryId,
		Version:    versionName,
		Kind:       kinds,
		Limit:      limit,
		Page:       page,
	})
	if err != nil {
		c.responder.RespondWithError(w, "Failed to search the classes", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}
