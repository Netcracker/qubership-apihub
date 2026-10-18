package controller

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	aiservice "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
)

const aiChatListDefaultLimit = 100
const aiChatListMaxLimit = 200

func aiChatBadRequestBodyErr(decodeErr error) *exception.CustomError {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.AiChatValidationFailed,
		Message: exception.AiChatValidationFailedMsg,
		Debug:   decodeErr.Error(),
	}
}

func getAiChatLimitQueryParam(r *http.Request) (int, *exception.CustomError) {
	if r.URL.Query().Get("limit") == "" {
		return aiChatListDefaultLimit, nil
	}
	limit, err := strconv.Atoi(r.URL.Query().Get("limit"))
	if err != nil {
		return 0, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AiChatValidationFailed,
			Message: exception.IncorrectParamTypeMsg,
			Params:  map[string]interface{}{"param": "limit", "type": "int"},
			Debug:   err.Error(),
		}
	}
	if limit < 1 || limit > aiChatListMaxLimit {
		return 0, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AiChatValidationFailed,
			Message: exception.InvalidLimitMsg,
			Params:  map[string]interface{}{"value": limit, "maxLimit": aiChatListMaxLimit},
		}
	}
	return limit, nil
}

func validateAiChatSendMessageRequest(body *view.AiChatSendMessageRequest) *exception.CustomError {
	if body == nil || strings.TrimSpace(body.Content) == "" {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AiChatValidationFailed,
			Message: exception.AiChatEmptyBodyMsg,
		}
	}
	if utf8.RuneCountInString(body.Content) > aiservice.MaxAiUserMessageRunes {
		return &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AiChatValidationFailed,
			Message: exception.AiChatMessageTooLongMsg,
			Params:  map[string]interface{}{"max": aiservice.MaxAiUserMessageRunes},
		}
	}
	if body.ClientMessageID != nil && *body.ClientMessageID != "" {
		if _, err := uuid.Parse(*body.ClientMessageID); err != nil {
			return &exception.CustomError{
				Status:  http.StatusBadRequest,
				Code:    exception.AiChatValidationFailed,
				Message: exception.AiChatValidationFailedMsg,
				Debug:   err.Error(),
			}
		}
	}
	return nil
}

func decodeAiChatJSONBody(r *http.Request, dest interface{}, allowEOF bool) *exception.CustomError {
	err := json.NewDecoder(r.Body).Decode(dest)
	if err == nil {
		return nil
	}
	if allowEOF && err == io.EOF {
		return nil
	}
	return aiChatBadRequestBodyErr(err)
}
