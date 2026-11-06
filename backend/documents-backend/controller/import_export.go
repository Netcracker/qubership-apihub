package controller

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/Netcracker/qubership-apihub/backend/documents-backend/exception"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/responder"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/secctx"
	"github.com/Netcracker/qubership-apihub/backend/documents-backend/service"
)

const maxImportArchiveSize = 64 << 20

type ImportExportController interface {
	Import(w http.ResponseWriter, r *http.Request)
	Export(w http.ResponseWriter, r *http.Request)
}

func NewImportExportController(importService service.ImportService, exportService service.ExportService, responder responder.Responder) ImportExportController {
	return &importExportControllerImpl{importService: importService, exportService: exportService, responder: responder}
}

type importExportControllerImpl struct {
	importService service.ImportService
	exportService service.ExportService
	responder     responder.Responder
}

// POST /api/v1/admin/import?validate=true|false
// Body: multipart with field "archive" (zip), or a raw application/zip body.
func (c importExportControllerImpl) Import(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !checkSysadm(w, ctx, c.responder) {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxImportArchiveSize)
	var data []byte
	if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/") {
		if err := r.ParseMultipartForm(8 << 20); err != nil {
			c.responder.RespondWithCustomError(w, requestTooLarge(err, maxImportArchiveSize))
			return
		}
		file, _, err := r.FormFile("archive")
		if err != nil {
			c.responder.RespondWithCustomError(w, &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.RequiredParamsMissing,
				Message: exception.RequiredParamsMissingMsg,
				Params:  map[string]interface{}{"params": "archive"},
			})
			return
		}
		defer file.Close()
		var buf bytes.Buffer
		if _, err := buf.ReadFrom(file); err != nil {
			c.responder.RespondWithCustomError(w, requestTooLarge(err, maxImportArchiveSize))
			return
		}
		data = buf.Bytes()
	} else {
		var err error
		if data, err = io.ReadAll(r.Body); err != nil {
			c.responder.RespondWithCustomError(w, requestTooLarge(err, maxImportArchiveSize))
			return
		}
	}
	if len(data) == 0 {
		c.responder.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.ImportArchiveInvalid,
			Message: exception.ImportArchiveInvalidMsg,
			Params:  map[string]interface{}{"reason": "empty archive"},
		})
		return
	}
	validate := r.URL.Query().Get("validate") != "false"
	result, err := c.importService.ImportZip(ctx, data, service.ImportOptions{ValidatePackageRefs: validate})
	if err != nil {
		c.responder.RespondWithError(w, r, "Failed to import articles", err)
		return
	}
	c.responder.RespondWithJson(w, http.StatusOK, result)
}

// GET /api/v1/admin/export
func (c importExportControllerImpl) Export(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	if !checkSysadm(w, ctx, c.responder) {
		return
	}
	var buf bytes.Buffer
	if err := c.exportService.Export(ctx, &buf); err != nil {
		c.responder.RespondWithError(w, r, "Failed to export articles", err)
		return
	}
	w.Header().Set("Content-Type", "application/zip")
	w.Header().Set("Content-Disposition", `attachment; filename="documents-export.zip"`)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(buf.Bytes())
}
