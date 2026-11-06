package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/view"
)

// AdminNavigationController: navigation sections and items CRUD for APIHUB system administrators; package-scoped
// navigation is also open to callers with the APIHUB package permission (see service.PackageAccessService).
type AdminNavigationController interface {
	GetNavigation(w http.ResponseWriter, r *http.Request)
	CreateSection(w http.ResponseWriter, r *http.Request)
	UpdateSection(w http.ResponseWriter, r *http.Request)
	DeleteSection(w http.ResponseWriter, r *http.Request)
	CreateItem(w http.ResponseWriter, r *http.Request)
	UpdateItem(w http.ResponseWriter, r *http.Request)
	DeleteItem(w http.ResponseWriter, r *http.Request)
}

func NewAdminNavigationController(navigationService service.NavigationService, packageAccessService service.PackageAccessService, responder responder.Responder) AdminNavigationController {
	return &adminNavigationControllerImpl{navigationService: navigationService, packageAccessService: packageAccessService, responder: responder}
}

type adminNavigationControllerImpl struct {
	navigationService    service.NavigationService
	packageAccessService service.PackageAccessService
	responder            responder.Responder
}

// GET /api/v1/admin/navigation?scope=&packageId=
func (n adminNavigationControllerImpl) GetNavigation(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	q := r.URL.Query()
	if !authorized(w, r, n.responder, n.packageAccessService.CheckScopeAdmin(ctx, q.Get("scope"), q.Get("packageId"))) {
		return
	}
	navigation, err := n.navigationService.GetAdminNavigation(ctx, q.Get("scope"), q.Get("packageId"))
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to get navigation", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusOK, navigation)
}

// POST /api/v1/admin/navigation/sections
func (n adminNavigationControllerImpl) CreateSection(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	var req view.NavSectionRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		n.responder.RespondWithCustomError(w, customError)
		return
	}
	if !authorized(w, r, n.responder, n.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	section, err := n.navigationService.CreateSection(ctx, req)
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to create navigation section", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusCreated, section)
}

// PUT /api/v1/admin/navigation/sections/{id}
func (n adminNavigationControllerImpl) UpdateSection(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, n.responder, n.packageAccessService.CheckSectionAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	var req view.NavSectionRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		n.responder.RespondWithCustomError(w, customError)
		return
	}
	if !authorized(w, r, n.responder, n.packageAccessService.CheckScopeAdmin(ctx, req.Scope, req.PackageId)) {
		return
	}
	section, err := n.navigationService.UpdateSection(ctx, getStringParam(r, "id"), req)
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to update navigation section", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusOK, section)
}

// DELETE /api/v1/admin/navigation/sections/{id}
func (n adminNavigationControllerImpl) DeleteSection(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, n.responder, n.packageAccessService.CheckSectionAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	if err := n.navigationService.DeleteSection(ctx, getStringParam(r, "id")); err != nil {
		n.responder.RespondWithError(w, r, "Failed to delete navigation section", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// POST /api/v1/admin/navigation/items
func (n adminNavigationControllerImpl) CreateItem(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	var req view.NavItemRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		n.responder.RespondWithCustomError(w, customError)
		return
	}
	if !authorized(w, r, n.responder, n.packageAccessService.CheckSectionAdmin(ctx, req.SectionId)) {
		return
	}
	item, err := n.navigationService.CreateItem(ctx, req)
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to create navigation item", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusCreated, item)
}

// PUT /api/v1/admin/navigation/items/{id}
func (n adminNavigationControllerImpl) UpdateItem(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, n.responder, n.packageAccessService.CheckItemAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	var req view.NavItemRequest
	if customError := decodeJsonBody(r, &req); customError != nil {
		n.responder.RespondWithCustomError(w, customError)
		return
	}
	item, err := n.navigationService.UpdateItem(ctx, getStringParam(r, "id"), req)
	if err != nil {
		n.responder.RespondWithError(w, r, "Failed to update navigation item", err)
		return
	}
	n.responder.RespondWithJson(w, http.StatusOK, item)
}

// DELETE /api/v1/admin/navigation/items/{id}
func (n adminNavigationControllerImpl) DeleteItem(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !authorized(w, r, n.responder, n.packageAccessService.CheckItemAdmin(ctx, getStringParam(r, "id"))) {
		return
	}
	if err := n.navigationService.DeleteItem(ctx, getStringParam(r, "id")); err != nil {
		n.responder.RespondWithError(w, r, "Failed to delete navigation item", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
