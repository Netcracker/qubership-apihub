package controller

import (
	"fmt"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/responder"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type InternalDocumentController interface {
	GetVersionInternalDocuments(w http.ResponseWriter, r *http.Request)
	GetVersionInternalDocumentData(w http.ResponseWriter, r *http.Request)
	GetComparisonInternalDocuments(w http.ResponseWriter, r *http.Request)
	GetComparisonInternalDocumentData(w http.ResponseWriter, r *http.Request)
}

func NewInternalDocumentController(publishedService service.PublishedService, roleService service.RoleService, responder responder.Responder) InternalDocumentController {
	return &internalDocumentControllerImpl{
		publishedService: publishedService,
		roleService:      roleService,
		responder:        responder,
	}
}

type internalDocumentControllerImpl struct {
	publishedService service.PublishedService
	roleService      service.RoleService
	responder        responder.Responder
}

func (c *internalDocumentControllerImpl) GetVersionInternalDocuments(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to check user privileges", err)
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
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}

	response, err := c.publishedService.GetVersionInternalDocuments(ctx, packageId, version)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get internal documents for version", err)
		return
	}

	c.responder.RespondWithJson(w, http.StatusOK, response)
}

func (c *internalDocumentControllerImpl) GetVersionInternalDocumentData(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	hash := getStringParam(r, "hash")

	data, filename, err := c.publishedService.GetVersionInternalDocumentData(ctx, hash)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get internal document data", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}

func (c *internalDocumentControllerImpl) GetComparisonInternalDocuments(w http.ResponseWriter, r *http.Request) {
	var err error
	packageId := getStringParam(r, "packageId")
	ctx := secctx.MakeUserContext(r)
	sufficientPrivileges, err := c.roleService.HasRequiredPermissions(ctx, packageId, view.ReadPermission)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to check user privileges", err)
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
	version, err := getUnescapedStringParam(r, "version")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "version"},
			Debug:   err.Error(),
		})
		return
	}
	previousVersion := r.URL.Query().Get("previousVersion")
	previousVersionPackageId := r.URL.Query().Get("previousVersionPackageId")
	refPackageId := r.URL.Query().Get("refPackageId")

	response, err := c.publishedService.GetComparisonInternalDocuments(ctx, packageId, version, previousVersionPackageId, previousVersion, refPackageId)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get internal documents for comparison", err)
		return
	}

	c.responder.RespondWithJson(w, http.StatusOK, response)
}

func (c *internalDocumentControllerImpl) GetComparisonInternalDocumentData(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	hash := getStringParam(r, "hash")

	data, filename, err := c.publishedService.GetComparisonInternalDocumentData(ctx, hash)
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to get internal document data", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	w.WriteHeader(http.StatusOK)
	w.Write(data)
}
