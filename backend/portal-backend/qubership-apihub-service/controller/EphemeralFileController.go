package controller

import (
	"net/http"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	aiservice "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/security"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/gorilla/mux"
)

// Download: resolve file row (404 if missing/expired) before JWT check, then ownership.
type EphemeralFileController struct {
	svc aiservice.EphemeralFileService
}

func NewEphemeralFileController(svc aiservice.EphemeralFileService) *EphemeralFileController {
	return &EphemeralFileController{svc: svc}
}

func (c *EphemeralFileController) Download(w http.ResponseWriter, r *http.Request) {
	fileID := mux.Vars(r)["fileId"]

	f, err := c.svc.GetFileByID(r.Context(), fileID)
	if err != nil {
		utils.RespondWithError(w, "Get file", err)
		return
	}
	if f == nil || f.ExpiresAt.Before(time.Now().UTC()) {
		utils.RespondWithCustomError(w, errEphemeralFileNotFound(fileID))
		return
	}

	token := r.URL.Query().Get("token")
	if token == "" {
		utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusUnauthorized, Code: exception.EphemeralFileTokenMissing, Message: exception.EphemeralFileTokenMissingMsg})
		return
	}
	uid, tokFileID, err := security.ValidateEphemeralFileToken(token)
	if err != nil {
		if security.IsTokenExpiredError(err) {
			utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusGone, Code: exception.EphemeralFileTokenExpired, Message: exception.EphemeralFileTokenExpiredMsg, Debug: err.Error()})
			return
		}
		utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusUnauthorized, Code: exception.EphemeralFileTokenInvalid, Message: exception.EphemeralFileTokenInvalidMsg, Debug: err.Error()})
		return
	}
	if tokFileID != fileID {
		utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusUnauthorized, Code: exception.EphemeralFileTokenInvalid, Message: exception.EphemeralFileTokenFileMismatchMsg})
		return
	}

	if uid != f.UserID {
		utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusUnauthorized, Code: exception.EphemeralFileTokenInvalid, Message: exception.EphemeralFileTokenFileMismatchMsg})
		return
	}

	file, err := os.Open(f.StoragePath)
	if err != nil {
		utils.RespondWithCustomError(w, errEphemeralFileNotFound(fileID))
		return
	}
	defer file.Close()
	st, err := file.Stat()
	if err != nil || st.IsDir() {
		utils.RespondWithCustomError(w, errEphemeralFileNotFound(fileID))
		return
	}

	if f.MimeType != nil {
		w.Header().Set("Content-Type", *f.MimeType)
	} else {
		w.Header().Set("Content-Type", "application/octet-stream")
	}
	w.Header().Set("Content-Disposition", "attachment; filename=\""+escapeFilename(f.Filename)+"\"")
	http.ServeContent(w, r, "", st.ModTime(), file)
}

func errEphemeralFileNotFound(fileID string) *exception.CustomError {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.EphemeralFileNotFound,
		Message: exception.EphemeralFileNotFoundMsg,
		Params:  map[string]interface{}{"fileId": fileID},
	}
}

func escapeFilename(s string) string {
	s = strings.Map(func(r rune) rune {
		if !utf8.ValidRune(r) || r < 0x20 || r == 0x7f {
			return -1
		}
		if r == '"' {
			return '\''
		}
		return r
	}, s)
	return s
}
