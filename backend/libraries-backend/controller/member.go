package controller

import (
	"net/http"

	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/service"
	"github.com/Netcracker/qubership-apihub/backend/libraries-backend/view"
)

type MemberController interface {
	GetMembers(w http.ResponseWriter, r *http.Request)
	PutMember(w http.ResponseWriter, r *http.Request)
	DeleteMember(w http.ResponseWriter, r *http.Request)
}

func NewMemberController(
	memberService service.MemberService,
	libraryService service.LibraryService,
	authorizationService service.AuthorizationService,
	resp responder.Responder,
) MemberController {
	return memberControllerImpl{
		memberService:        memberService,
		libraryService:       libraryService,
		authorizationService: authorizationService,
		responder:            resp,
	}
}

type memberControllerImpl struct {
	memberService        service.MemberService
	libraryService       service.LibraryService
	authorizationService service.AuthorizationService
	responder            responder.Responder
}

func (c memberControllerImpl) GetMembers(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	library := authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.UserAccessManagementPermission)
	if library == nil {
		return
	}

	members, err := c.memberService.List(ctx, *library)
	if err != nil {
		c.responder.RespondWithError(w, "Failed to get the library members", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, members)
}

// PutMember replaces the user's whole role set on this library. An empty array clears the direct roles; the
// user may still hold a role inherited from the parent package group.
func (c memberControllerImpl) PutMember(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	library := authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.UserAccessManagementPermission)
	if library == nil {
		return
	}

	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
			Debug:   err.Error(),
		})
		return
	}

	var req view.SetMemberRolesReq
	if !decodeBody(w, r, c.responder, &req) {
		return
	}
	if req.RoleIds == nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.RequiredParamsMissing,
			Message: exception.RequiredParamsMissingMsg,
			Params:  map[string]interface{}{"params": "roleIds"},
		})
		return
	}

	if err := c.memberService.SetRoles(ctx, *library, userId, req.RoleIds); err != nil {
		c.responder.RespondWithError(w, "Failed to set the member roles", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c memberControllerImpl) DeleteMember(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	libraryId := getStringParam(r, "libraryId")

	library := authorize(ctx, w, c.responder, c.libraryService, c.authorizationService, libraryId, view.UserAccessManagementPermission)
	if library == nil {
		return
	}

	userId, err := getUnescapedStringParam(r, "userId")
	if err != nil {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.InvalidURLEscape,
			Message: exception.InvalidURLEscapeMsg,
			Params:  map[string]interface{}{"param": "userId"},
			Debug:   err.Error(),
		})
		return
	}

	if err := c.memberService.Delete(ctx, *library, userId); err != nil {
		c.responder.RespondWithError(w, "Failed to remove the member", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
