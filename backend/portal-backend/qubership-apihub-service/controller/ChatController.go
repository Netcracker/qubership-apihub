// Copyright 2024-2025 NetCracker Technology Corporation
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controller

import (
	"encoding/json"
	"io/ioutil"
	"net/http"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	aiservice "github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	log "github.com/sirupsen/logrus"
)

type ChatController interface {
	Chat(w http.ResponseWriter, r *http.Request)
	ChatStream(w http.ResponseWriter, r *http.Request)
}

func NewChatController(chatService aiservice.ChatService) ChatController {
	return &chatControllerImpl{
		chatService: chatService,
	}
}

type chatControllerImpl struct {
	chatService aiservice.ChatService
}

func (c *chatControllerImpl) Chat(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	var chatReq view.ChatRequest
	if err := json.Unmarshal(body, &chatReq); err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	// Log incoming request - find last user message
	userMessage := ""
	for i := len(chatReq.Messages) - 1; i >= 0; i-- {
		if chatReq.Messages[i].Role == "user" {
			userMessage = chatReq.Messages[i].Content
			break
		}
	}
	log.Debugf("Chat API request received. Last user message: %s", userMessage)

	validationErr := utils.ValidateObject(chatReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}

	response, err := c.chatService.Chat(r.Context(), chatReq)
	if err != nil {
		log.Errorf("Chat service error: %v", err)
		utils.RespondWithError(w, "Failed to process chat request", err)
		return
	}

	log.Debugf("Chat API response generated. Response length: %d", len(response.Message.Content))

	utils.RespondWithJson(w, http.StatusOK, response)
}

func (c *chatControllerImpl) ChatStream(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	var chatReq view.ChatRequest
	if err := json.Unmarshal(body, &chatReq); err != nil {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.BadRequestBody,
			Message: exception.BadRequestBodyMsg,
			Debug:   err.Error(),
		})
		return
	}

	chatReq.Stream = true

	validationErr := utils.ValidateObject(chatReq)
	if validationErr != nil {
		if customError, ok := validationErr.(*exception.CustomError); ok {
			utils.RespondWithCustomError(w, customError)
			return
		}
	}

	// Set headers for streaming
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no") // Disable nginx buffering

	// Create a flusher to send data immediately
	flusher, ok := w.(http.Flusher)
	if !ok {
		utils.RespondWithCustomError(w, &exception.CustomError{
			Status:  http.StatusInternalServerError,
			Code:    exception.UnableToSelectWsServer,
			Message: "Streaming not supported",
		})
		return
	}

	// Stream the response
	err = c.chatService.ChatStream(r.Context(), chatReq, w)
	if err != nil {
		// Try to send error as JSON
		errorResponse := view.ChatStreamChunk{
			Delta: "",
			Done:  true,
		}
		errorJSON, _ := json.Marshal(errorResponse)
		w.Write(errorJSON)
		w.Write([]byte("\n"))
		flusher.Flush()
		return
	}

	flusher.Flush()
}
