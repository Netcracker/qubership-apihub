package controller

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/secctx"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/service"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
)

type AiChatController struct {
	chatsSvc      service.AiChatsService
	aiSvc         service.AiChatTurnService
	monitoringSvc service.MonitoringService
}

func NewAiChatController(chatsSvc service.AiChatsService, aiSvc service.AiChatTurnService, monitoringSvc service.MonitoringService) *AiChatController {
	return &AiChatController{chatsSvc: chatsSvc, aiSvc: aiSvc, monitoringSvc: monitoringSvc}
}

func (c *AiChatController) ListChats(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	limit, ce := getAiChatLimitQueryParam(r)
	if ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	var before *time.Time
	if b := r.URL.Query().Get("before"); b != "" {
		t, err := time.Parse(time.RFC3339, b)
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.AiChatValidationFailed, Message: exception.AiChatInvalidBeforeCursorMsg, Debug: err.Error()})
			return
		}
		before = &t
	}
	beforeID := r.URL.Query().Get("beforeId")
	search := r.URL.Query().Get("search")
	res, err := c.chatsSvc.ListChats(ctx, uid, search, before, beforeID, limit)
	if err != nil {
		utils.RespondWithError(w, r, "list chats", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, res)
}

func (c *AiChatController) CreateChat(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	var body view.AiChatCreateRequest
	if ce := decodeAiChatJSONBody(r, &body, true); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	res, err := c.chatsSvc.CreateChat(ctx, uid, body.Title)
	if err != nil {
		utils.RespondWithError(w, r, "create chat", err)
		return
	}
	utils.RespondWithJson(w, http.StatusCreated, res)
}

func (c *AiChatController) GetChat(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	res, err := c.chatsSvc.GetChat(ctx, uid, chatID)
	if err != nil {
		utils.RespondWithError(w, r, "get chat", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, res)
}

func (c *AiChatController) UpdateChat(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	var body view.AiChatUpdateRequest
	if ce := decodeAiChatJSONBody(r, &body, false); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	res, err := c.chatsSvc.UpdateChat(ctx, uid, chatID, &body)
	if err != nil {
		utils.RespondWithError(w, r, "update chat", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, res)
}

func (c *AiChatController) DeleteChat(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	if err := c.chatsSvc.DeleteChat(ctx, uid, chatID); err != nil {
		utils.RespondWithError(w, r, "delete chat", err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (c *AiChatController) ListMessages(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	limit, ce := getAiChatLimitQueryParam(r)
	if ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	var before *time.Time
	if b := r.URL.Query().Get("before"); b != "" {
		t, err := time.Parse(time.RFC3339, b)
		if err != nil {
			utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.AiChatValidationFailed, Message: exception.AiChatInvalidBeforeCursorMsg, Debug: err.Error()})
			return
		}
		before = &t
	}
	beforeID := r.URL.Query().Get("beforeId")
	res, err := c.chatsSvc.ListMessages(ctx, uid, chatID, before, beforeID, limit)
	if err != nil {
		utils.RespondWithError(w, r, "list messages", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, res)
}

func (c *AiChatController) SendMessage(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	var body view.AiChatSendMessageRequest
	if ce := decodeAiChatJSONBody(r, &body, false); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	if ce := validateAiChatSendMessageRequest(&body); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	c.monitoringSvc.IncreaseBusinessMetricCounter(uid, metrics.AIChatCalled, "chat messages")

	ctx = service.SetMCPClientLabel(ctx, service.MCPClientLabelInternalAIChat)
	res, err := c.aiSvc.SendMessage(ctx, uid, chatID, &body)
	if err != nil {
		utils.RespondWithError(w, r, "send", err)
		return
	}
	utils.RespondWithJson(w, http.StatusOK, res)
}

func (c *AiChatController) SendMessageStream(w http.ResponseWriter, r *http.Request) {
	ctx := secctx.MakeUserContext(r)
	uid := secctx.GetUserId(ctx)
	chatID := getStringParam(r, "chatId")
	var body view.AiChatSendMessageRequest
	if ce := decodeAiChatJSONBody(r, &body, false); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}
	if ce := validateAiChatSendMessageRequest(&body); ce != nil {
		utils.RespondWithCustomError(w, ce)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")
	fl, ok := w.(http.Flusher)
	if !ok {
		utils.RespondWithCustomError(w, &exception.CustomError{Status: http.StatusInternalServerError, Code: exception.AiChatInternalError, Message: exception.AiChatStreamingNotSupportedMsg})
		return
	}

	c.monitoringSvc.IncreaseBusinessMetricCounter(uid, metrics.AIChatCalled, "chat messages")

	ctx = service.SetMCPClientLabel(ctx, service.MCPClientLabelInternalAIChat)
	ch, err := c.aiSvc.SendMessageStream(ctx, uid, chatID, &body)
	if err != nil {
		utils.RespondWithError(w, r, "stream", err)
		return
	}

	for item := range ch {
		b, _ := json.Marshal(item.Data)
		_, _ = io.WriteString(w, "event: "+item.EventName+"\n")
		_, _ = io.WriteString(w, "data: "+string(b)+"\n\n")
		fl.Flush()
	}
}
