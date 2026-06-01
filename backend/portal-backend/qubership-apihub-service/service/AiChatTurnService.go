package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/entity"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/exception"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/metrics"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/repository"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/utils"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	"github.com/google/uuid"
	mcpgo "github.com/mark3labs/mcp-go/mcp"
	log "github.com/sirupsen/logrus"
)

const (
	// Intentional hardcode — product decision, matches the FE limit; not operator-tunable.
	MaxAiPinnedChatsPerUser = 3
	MaxAiUserMessageRunes   = 32000
	minRecentMessagesAfterCompaction = 8
	maxToolLoopIterations   = 10
	maxCompactionSummaryPreviewRunes = 240
)

type AiChatTurnService interface {
	SendMessage(ctx context.Context, userID, chatID string, req *view.AiChatSendMessageRequest) (*view.AiChatSendMessageResponse, error)
	SendMessageStream(ctx context.Context, userID, chatID string, req *view.AiChatSendMessageRequest) (<-chan AiChatStreamChunk, error)
}

type AiChatStreamChunk struct {
	EventName string
	Data      interface{}
}

// avoids import cycle service ↔ security
type FileTokenMinter func(userID, fileID string, ttl time.Duration) (string, error)

func errAiNotFound(chatID string) *exception.CustomError {
	return &exception.CustomError{
		Status:  http.StatusNotFound,
		Code:    exception.AiChatNotFound,
		Message: exception.AiChatNotFoundMsg,
		Params:  map[string]interface{}{"chatId": chatID},
	}
}

func errAiPinLimit() *exception.CustomError {
	return &exception.CustomError{
		Status:  http.StatusBadRequest,
		Code:    exception.AiChatPinLimitExceeded,
		Message: exception.AiChatPinLimitExceededMsg,
		Params:  map[string]interface{}{"max": MaxAiPinnedChatsPerUser},
	}
}

// aiChatStreamErrorPayload maps a turn failure to a single terminal SSE error frame.
func aiChatStreamErrorPayload(err error) (code string, message string) {
	var ce *exception.CustomError
	if errors.As(err, &ce) && ce.Code != "" {
		return ce.Code, ce.Error()
	}
	return exception.AiChatLLMError, err.Error()
}

func mustGetAiChat(ctx context.Context, repo repository.AiChatRepository, userID, chatID string) (*entity.AiChatEntity, error) {
	ch, err := repo.GetChatByIDForUser(ctx, chatID, userID)
	if err != nil {
		return nil, err
	}
	if ch == nil {
		return nil, errAiNotFound(chatID)
	}
	return ch, nil
}

func truncateRunes(s string, n int) string {
	if n <= 0 {
		return ""
	}
	rs := []rune(s)
	if len(rs) <= n {
		return s
	}
	return string(rs[:n]) + "…"
}

type toolCallRecord struct {
	ToolCallID string
	Inv        view.AiChatToolInvocation
}

type chatTurnResult struct {
	AssistantContent string
	Usage            *client.ChatUsage
	ToolInvocations  []view.AiChatToolInvocation
	ToolCallRecords  []toolCallRecord
}

type chatStreamHooks struct {
	OnTextDelta     func(delta string)
	OnToolStart     func(callID, name string)
	OnToolCompleted func(rec toolCallRecord)
}

const toolNameAskClarification = "ask_clarification"

func makeAskClarificationTool() client.LLMTool {
	return client.LLMTool{
		Name: toolNameAskClarification,
		Description: "Ask the user a single clarifying question when their request is too ambiguous to answer reliably. " +
			"The question you provide will be shown to the user as your response. " +
			"Use this instead of guessing. Do NOT use it when a search could resolve the ambiguity — try searching first.",
		Parameters: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"question": map[string]interface{}{
					"type":        "string",
					"description": "A specific, concise clarifying question for the user. One question only.",
				},
			},
			"required": []string{"question"},
		},
	}
}

type aiChatTurnServiceImpl struct {
	sis            SystemInfoService
	repo           repository.AiChatRepository
	mcpService     MCPService
	generatedFiles EphemeralFileService
	mintFileToken  FileTokenMinter
	llm            client.LlmClient
	mcpTools       []client.LLMTool

	packagesListCache struct {
		mu        sync.RWMutex
		data      string
		expiresAt time.Time
	}
}

func NewAiChatTurnService(
	sis SystemInfoService,
	repo repository.AiChatRepository,
	llm client.LlmClient,
	mcp MCPService,
	generatedFiles EphemeralFileService,
	mint FileTokenMinter,
) (AiChatTurnService, error) {
	if mint == nil {
		return nil, fmt.Errorf("file token minter is required")
	}

	mcpTools := mcp.MakeLLMTools()
	if mcp.IDSAssetsAvailable() && generatedFiles != nil {
		mcpTools = append(mcpTools, makeIDSChatTools()...)
	} else {
		log.Info("ai-chat: IDS authoring tools NOT exposed (assets/services missing)")
	}
	mcpTools = append(mcpTools, makeAskClarificationTool())

	log.Infof("AiChatService initialized with %d LLM tools", len(mcpTools))
	for _, tool := range mcpTools {
		log.Debugf("LLM tool available: %s - %s", tool.Name, tool.Description)
	}

	return &aiChatTurnServiceImpl{
		sis:            sis,
		repo:           repo,
		mcpService:     mcp,
		generatedFiles: generatedFiles,
		mintFileToken:  mint,
		llm:            llm,
		mcpTools:       mcpTools,
	}, nil
}

func (s *aiChatTurnServiceImpl) SendMessage(ctx context.Context, userID, chatID string, req *view.AiChatSendMessageRequest) (*view.AiChatSendMessageResponse, error) {
	chat, err := mustGetAiChat(ctx, s.repo, userID, chatID)
	if err != nil {
		return nil, err
	}
	if utf8.RuneCountInString(req.Content) > MaxAiUserMessageRunes {
		return nil, &exception.CustomError{
			Status:  http.StatusBadRequest,
			Code:    exception.AiChatValidationFailed,
			Message: exception.AiChatMessageTooLongMsg,
			Params:  map[string]interface{}{"max": MaxAiUserMessageRunes},
		}
	}

	started := time.Now()
	um, am, e := s.runTurn(ctx, userID, chat, req, nil)
	s.observeTurn(AiChatTurnModeSync, started, e)
	if e != nil {
		return nil, e
	}
	return &view.AiChatSendMessageResponse{UserMessage: *um, AssistantMessage: *am}, nil
}

func (s *aiChatTurnServiceImpl) SendMessageStream(ctx context.Context, userID, chatID string, req *view.AiChatSendMessageRequest) (<-chan AiChatStreamChunk, error) {
	chat, err := mustGetAiChat(ctx, s.repo, userID, chatID)
	if err != nil {
		return nil, err
	}
	if utf8.RuneCountInString(req.Content) > MaxAiUserMessageRunes {
		return nil, &exception.CustomError{Status: http.StatusBadRequest, Code: exception.AiChatValidationFailed, Message: exception.AiChatMessageTooLongMsg, Params: map[string]interface{}{"max": MaxAiUserMessageRunes}}
	}

	out := make(chan AiChatStreamChunk, AiChatStreamChannelBuffer)
	go func() {
		defer close(out)
		started := time.Now()
		_, _, err := s.runTurn(ctx, userID, chat, req, out)
		s.observeTurn(AiChatTurnModeStream, started, err)
		if err != nil {
			code, message := aiChatStreamErrorPayload(err)
			_ = s.emitStream(ctx, out, aiChatSSEError, map[string]interface{}{
				aiChatSSEFieldType: aiChatSSEError,
				"code":             code,
				"message":          message,
			})
		}
	}()
	return out, nil
}

func (s *aiChatTurnServiceImpl) observeTurn(mode string, started time.Time, err error) {
	status := AiChatToolStatusOK
	if err != nil {
		status = AiChatToolStatusError
	}
	metrics.AiChatTurnsTotal.WithLabelValues(mode, status).Inc()
	metrics.AiChatTurnDuration.WithLabelValues(mode, status).Observe(time.Since(started).Seconds())
}

func streamModeForChan(ch chan<- AiChatStreamChunk) string {
	if ch == nil {
		return AiChatTurnModeSync
	}
	return AiChatTurnModeStream
}

func (s *aiChatTurnServiceImpl) emitStream(ctx context.Context, ch chan<- AiChatStreamChunk, name string, data interface{}) error {
	if ch == nil {
		return nil
	}
	select {
	case ch <- AiChatStreamChunk{EventName: name, Data: data}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

// Idempotency: cached pair when user+assistant exist for clientMessageId; retry LLM when user
// exists without assistant; concurrent inserts race on partial unique index and replay.
func (s *aiChatTurnServiceImpl) runTurn(ctx context.Context, userID string, chat *entity.AiChatEntity, req *view.AiChatSendMessageRequest, stream chan<- AiChatStreamChunk) (*view.AiChatMessage, *view.AiChatMessage, error) {
	var clientID *string
	if req.ClientMessageID != nil && *req.ClientMessageID != "" {
		c := *req.ClientMessageID
		clientID = &c
	}

	if clientID != nil {
		existing, err := s.repo.FindUserMessageByClientID(ctx, chat.ID, *clientID)
		if err != nil {
			return nil, nil, err
		}
		if existing != nil {
			if a, err := s.repo.FindNextAssistantMessage(ctx, chat.ID, existing.CreatedAt); err != nil {
				return nil, nil, err
			} else if a != nil {
				return s.serveCachedPair(ctx, existing, a, stream)
			}
			return s.runLLMTurn(ctx, userID, chat, existing, stream)
		}
	}

	now := time.Now().UTC()
	um := &entity.AiChatMessageEntity{
		ID:              uuid.NewString(),
		ChatID:          chat.ID,
		Role:            ChatRoleUser,
		Content:         req.Content,
		ClientMessageID: clientID,
		CreatedAt:       now,
	}
	inserted, err := s.repo.TryInsertUserMessageIdempotent(ctx, um)
	if err != nil {
		return nil, nil, err
	}
	if !inserted {
		return s.replayIdempotent(ctx, userID, chat.ID, *clientID, stream)
	}

	return s.runLLMTurn(ctx, userID, chat, um, stream)
}

func (s *aiChatTurnServiceImpl) runLLMTurn(ctx context.Context, userID string, chat *entity.AiChatEntity, um *entity.AiChatMessageEntity, stream chan<- AiChatStreamChunk) (*view.AiChatMessage, *view.AiChatMessage, error) {
	if AiChatCorrelationIDFromContext(ctx) == "" {
		ctx = WithAiChatCorrelationID(ctx, uuid.NewString())
	}
	ctx = WithAiChatTurn(ctx, userID, chat.ID)

	hist, err := s.repo.ListMessagesChronological(ctx, chat.ID, repository.DefaultAiContextMessagesLimit)
	if err != nil {
		return nil, nil, err
	}

	if compactedNow, evt := s.maybeCompactBefore(ctx, chat, hist); compactedNow {
		metrics.AiChatCompactionsTotal.Inc()
		if stream != nil && evt != nil {
			_ = s.emitStream(ctx, stream, aiChatSSEContextCompacted, evt)
		}
		log.WithFields(log.Fields{
			"chatId": chat.ID,
			"userId": userID,
		}).Info("ai-chat: context compacted")
	}

	msgsForLLM := s.buildHistoryForLLM(chat, hist)

	// Ephemeral until InsertMessage; retry with the same clientMessageId allocates a new id.
	assistantID := uuid.NewString()
	if stream != nil {
		_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantStart, map[string]interface{}{
			aiChatSSEFieldType: aiChatSSEMessageAssistantStart, "messageId": assistantID,
		})
	}

	var hooks chatStreamHooks
	if stream != nil {
		hooks = chatStreamHooks{
			OnTextDelta: func(delta string) {
				_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantDelta, map[string]interface{}{
					aiChatSSEFieldType: aiChatSSEMessageAssistantDelta, "delta": delta,
				})
			},
			OnToolStart: func(callID, name string) {
				if name == toolNameAskClarification {
					return
				}
				_ = s.emitStream(ctx, stream, aiChatSSEToolStarted, map[string]interface{}{
					aiChatSSEFieldType: aiChatSSEToolStarted, "toolCallId": callID, "name": name,
				})
			},
			OnToolCompleted: func(rec toolCallRecord) {
				_ = s.emitStream(ctx, stream, aiChatSSEToolCompleted, map[string]interface{}{
					aiChatSSEFieldType: aiChatSSEToolCompleted,
					"toolCallId": rec.ToolCallID,
					"name":       rec.Inv.Name,
					"status":     rec.Inv.Status,
					"durationMs": rec.Inv.DurationMs,
				})
			},
		}
	}

	turn, err := s.runToolLoop(ctx, msgsForLLM, stream != nil, hooks)
	if err != nil {
		return nil, nil, err
	}

	createdA := time.Now().UTC()
	assistantEnt := &entity.AiChatMessageEntity{
		ID:              assistantID,
		ChatID:          chat.ID,
		Role:            ChatRoleAssistant,
		Content:         turn.AssistantContent,
		ToolInvocations: turn.ToolInvocations,
		CreatedAt:       createdA,
	}
	if err := s.repo.InsertMessage(ctx, assistantEnt); err != nil {
		return nil, nil, err
	}
	chat.LastMessageAt = createdA
	wasNeedingTitle := strings.TrimSpace(chat.Title) == "" && chat.MessagesCount < MaxMessagesBeforeStopAutoTitle
	chat.MessagesCount += 2
	if turn.Usage != nil {
		tk := turn.Usage.TotalTokens
		chat.LastTurnTokens = &tk
		metrics.AiChatTurnTokens.WithLabelValues(streamModeForChan(stream)).Observe(float64(turn.Usage.TotalTokens))
	}
	for _, inv := range turn.ToolInvocations {
		metrics.AiChatToolCallsTotal.WithLabelValues(inv.Name, inv.Status).Inc()
	}
	if err := s.repo.UpdateChat(ctx, chat); err != nil {
		return nil, nil, err
	}

	if wasNeedingTitle {
		s.scheduleAutoTitle(chat.ID, chat.UserID, um.Content, turn.AssistantContent)
	}

	umView := entity.MakeAiChatMessageView(um)
	amView := entity.MakeAiChatMessageView(assistantEnt)

	if stream != nil {
		_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantCompleted, map[string]interface{}{
			aiChatSSEFieldType: aiChatSSEMessageAssistantCompleted, "message": amView,
		})
		_ = s.emitStream(ctx, stream, aiChatSSEDone, map[string]interface{}{aiChatSSEFieldType: aiChatSSEDone})
	}

	return umView, amView, nil
}

func (s *aiChatTurnServiceImpl) replayIdempotent(ctx context.Context, userID, chatID, clientID string, stream chan<- AiChatStreamChunk) (*view.AiChatMessage, *view.AiChatMessage, error) {
	u, err := s.repo.FindUserMessageByClientID(ctx, chatID, clientID)
	if err != nil || u == nil {
		return nil, nil, &exception.CustomError{Status: http.StatusInternalServerError, Code: exception.AiChatInternalError, Message: exception.AiChatIdempotentReplayFailedMsg}
	}
	a, err := s.repo.FindNextAssistantMessage(ctx, chatID, u.CreatedAt)
	if err != nil {
		return nil, nil, err
	}
	if a == nil {
		chat, err := s.repo.GetChatByIDForUser(ctx, chatID, userID)
		if err != nil || chat == nil {
			return nil, nil, &exception.CustomError{Status: http.StatusInternalServerError, Code: exception.AiChatInternalError, Message: exception.AiChatIdempotentRetryFailedMsg}
		}
		return s.runLLMTurn(ctx, userID, chat, u, stream)
	}
	return s.serveCachedPair(ctx, u, a, stream)
}

func (s *aiChatTurnServiceImpl) serveCachedPair(ctx context.Context, u, a *entity.AiChatMessageEntity, stream chan<- AiChatStreamChunk) (*view.AiChatMessage, *view.AiChatMessage, error) {
	umView := entity.MakeAiChatMessageView(u)
	amView := entity.MakeAiChatMessageView(a)
	if stream != nil {
		_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantStart, map[string]interface{}{
			aiChatSSEFieldType: aiChatSSEMessageAssistantStart, "messageId": a.ID,
		})
		if amView != nil {
			runes := []rune(amView.Content)
			for i := 0; i < len(runes); i += AiChatStreamReplayChunkRunes {
				end := i + AiChatStreamReplayChunkRunes
				if end > len(runes) {
					end = len(runes)
				}
				_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantDelta, map[string]interface{}{
					aiChatSSEFieldType: aiChatSSEMessageAssistantDelta, "delta": string(runes[i:end]),
				})
			}
		}
		_ = s.emitStream(ctx, stream, aiChatSSEMessageAssistantCompleted, map[string]interface{}{
			aiChatSSEFieldType: aiChatSSEMessageAssistantCompleted, "message": amView,
		})
		_ = s.emitStream(ctx, stream, aiChatSSEDone, map[string]interface{}{aiChatSSEFieldType: aiChatSSEDone})
	}
	return umView, amView, nil
}

func (s *aiChatTurnServiceImpl) runToolLoop(ctx context.Context, history []client.ChatMessage, streaming bool, hooks chatStreamHooks) (*chatTurnResult, error) {
	systemMsg := s.buildSystemMessage(ctx)
	messages := append([]client.ChatMessage(nil), history...)

	var totalUsage client.ChatUsage
	var allToolInvocations []view.AiChatToolInvocation
	var allToolCallRecords []toolCallRecord
	var assistantText strings.Builder

	for iteration := 0; iteration < maxToolLoopIterations; iteration++ {
		req := client.LLMRequest{
			SystemMessage: systemMsg,
			Messages:      messages,
			Tools:         s.mcpTools,
			CorrelationID: AiChatCorrelationIDFromContext(ctx),
		}
		var resp *client.LLMResponse
		var err error
		if streaming {
			resp, err = s.llm.ExecuteStreaming(ctx, req, hooks.OnTextDelta, hooks.OnToolStart)
		} else {
			resp, err = s.llm.Execute(ctx, req)
		}
		if err != nil {
			return nil, err
		}

		assistantText.WriteString(resp.AssistantText)
		totalUsage.PromptTokens += resp.Usage.PromptTokens
		totalUsage.CompletionTokens += resp.Usage.CompletionTokens
		totalUsage.TotalTokens += resp.Usage.TotalTokens

		if len(resp.ToolCalls) == 0 {
			log.Debugf("Tool loop done after %d iteration(s) (streaming=%v)", iteration+1, streaming)
			break
		}

		// ask_clarification: final text only; do not append assistant tool_calls (dangling call on next turn).
		if question, isClarification := extractClarificationQuestion(resp.ToolCalls); isClarification {
			log.Debugf("Model requested clarification: %q", truncateRunes(question, MaxClarificationLogPreviewRunes))
			assistantText.WriteString(question)
			if streaming && hooks.OnTextDelta != nil {
				hooks.OnTextDelta(question)
			}
			break
		}

		messages = append(messages, client.ChatMessage{
			Role:      ChatRoleAssistant,
			Content:   resp.AssistantText,
			ToolCalls: resp.ToolCalls,
		})

		toolResultStrs, invocations, recs, err := s.executeToolCalls(ctx, resp.ToolCalls)
		if err != nil {
			log.Errorf("Tool execution failed: %v", err)
			toolResultStrs = make([]string, len(resp.ToolCalls))
		}
		allToolInvocations = append(allToolInvocations, invocations...)
		allToolCallRecords = append(allToolCallRecords, recs...)

		if streaming && hooks.OnToolCompleted != nil {
			for _, rec := range recs {
				hooks.OnToolCompleted(rec)
			}
		}

		for i, tc := range resp.ToolCalls {
			messages = append(messages, client.ChatMessage{
				Role:       ChatRoleTool,
				ToolCallID: tc.ID,
				Content:    toolResultStrs[i],
			})
		}

		if iteration == maxToolLoopIterations-1 {
			return nil, fmt.Errorf("reached maximum iterations (%d) without final response", maxToolLoopIterations)
		}
	}

	usage := totalUsage
	return &chatTurnResult{
		AssistantContent: assistantText.String(),
		ToolInvocations:  allToolInvocations,
		ToolCallRecords:  allToolCallRecords,
		Usage:            &usage,
	}, nil
}

func extractClarificationQuestion(toolCalls []client.LLMToolCall) (string, bool) {
	for _, tc := range toolCalls {
		if tc.Name != toolNameAskClarification {
			continue
		}
		var args struct {
			Question string `json:"question"`
		}
		if err := json.Unmarshal([]byte(tc.Arguments), &args); err != nil {
			log.Warnf("ask_clarification: failed to parse arguments: %v", err)
			return "", false
		}
		q := strings.TrimSpace(args.Question)
		if q == "" {
			log.Warn("ask_clarification: empty question in tool arguments")
			return "", false
		}
		return q, true
	}
	return "", false
}

func (s *aiChatTurnServiceImpl) executeToolCalls(ctx context.Context, toolCalls []client.LLMToolCall) ([]string, []view.AiChatToolInvocation, []toolCallRecord, error) {
	results := make([]string, len(toolCalls))
	invocations := make([]view.AiChatToolInvocation, 0, len(toolCalls))
	records := make([]toolCallRecord, 0, len(toolCalls))

	for i, toolCall := range toolCalls {
		log.Debugf("Executing tool call: %s with args: %s", toolCall.Name, toolCall.Arguments)
		started := time.Now()

		var args map[string]interface{}
		if err := json.Unmarshal([]byte(toolCall.Arguments), &args); err != nil {
			log.Errorf("Failed to parse tool arguments: %v", err)
			results[i] = fmt.Sprintf("Error parsing arguments: %v", err)
			ms := int(time.Since(started).Milliseconds())
			inv := view.AiChatToolInvocation{Name: toolCall.Name, Status: AiChatToolStatusError, DurationMs: &ms}
			invocations = append(invocations, inv)
			records = append(records, toolCallRecord{ToolCallID: toolCall.ID, Inv: inv})
			continue
		}

		argsBytes, _ := json.Marshal(args)
		mcpReqWrapper := view.MCPToolRequestWrapper{Name: toolCall.Name, Arguments: argsBytes}
		mcpReq := mcpReqWrapper.ToCallToolRequest()

		var result *mcpgo.CallToolResult
		var err error
		switch toolCall.Name {
		case ToolNameSearchOperations:
			result, err = s.mcpService.ExecuteSearchTool(ctx, mcpReq)
		case ToolNameGetOperationSpec:
			result, err = s.mcpService.ExecuteGetSpecTool(ctx, mcpReq)
		case ToolNameGetOperationDiff:
			result, err = s.mcpService.ExecuteGetOperationDiffTool(ctx, mcpReq)
		case ToolNameGetDocument:
			result, err = s.mcpService.ExecuteGetDocumentTool(ctx, mcpReq)
		case toolNameStartIDSGeneration:
			result, err = s.executeStartIDSGeneration(ctx, args)
		case toolNameSaveGeneratedFile:
			result, err = s.executeSaveGeneratedFile(ctx, args)
		default:
			results[i] = fmt.Sprintf("Unknown tool: %s", toolCall.Name)
			ms := int(time.Since(started).Milliseconds())
			inv := view.AiChatToolInvocation{Name: toolCall.Name, Status: AiChatToolStatusError, DurationMs: &ms}
			invocations = append(invocations, inv)
			records = append(records, toolCallRecord{ToolCallID: toolCall.ID, Inv: inv})
			continue
		}

		ms := int(time.Since(started).Milliseconds())
		if err != nil {
			log.Errorf("MCP tool execution failed: %v", err)
			results[i] = fmt.Sprintf("Error: %v", err)
			inv := view.AiChatToolInvocation{Name: toolCall.Name, Status: AiChatToolStatusError, DurationMs: &ms}
			invocations = append(invocations, inv)
			records = append(records, toolCallRecord{ToolCallID: toolCall.ID, Inv: inv})
			continue
		}

		status := AiChatToolStatusOK
		if result != nil && result.IsError {
			status = AiChatToolStatusError
		}
		inv := view.AiChatToolInvocation{Name: toolCall.Name, Status: status, DurationMs: &ms}
		if result != nil {
			invocations = append(invocations, inv)
			records = append(records, toolCallRecord{ToolCallID: toolCall.ID, Inv: inv})
		}

		if result == nil {
			continue
		}

		var resultLogBytes []byte
		resultLogBytes, _ = json.Marshal(result.Content)
		log.Debugf("MCP tool %s returned result (IsError=%v, Content length=%d): %s",
			toolCall.Name, result.IsError, len(result.Content), string(resultLogBytes))

		if result.IsError {
			contentStr := ""
			for _, content := range result.Content {
				if textContent, ok := content.(mcpgo.TextContent); ok {
					contentStr += textContent.Text
				}
			}
			if contentStr == "" {
				contentStr = "Unknown error from tool"
			}
			log.Warnf("MCP tool returned error: %s", contentStr)
			results[i] = contentStr
		} else {
			resultJSON, err := json.Marshal(result.Content)
			if err != nil {
				log.Errorf("Failed to marshal tool result: %v", err)
				results[i] = fmt.Sprintf("Error marshaling result: %v", err)
			} else {
				results[i] = string(resultJSON)
				log.Debugf("Tool %s executed successfully, result length: %d", toolCall.Name, len(results[i]))
			}
		}
	}

	return results, invocations, records, nil
}

func (s *aiChatTurnServiceImpl) historyRowsToChatMessages(rows []entity.AiChatMessageEntity) []client.ChatMessage {
	out := make([]client.ChatMessage, 0, len(rows))
	for i := range rows {
		if rows[i].Role != ChatRoleUser && rows[i].Role != ChatRoleAssistant {
			continue
		}
		out = append(out, client.ChatMessage{Role: rows[i].Role, Content: rows[i].Content})
	}
	return out
}

func (s *aiChatTurnServiceImpl) buildHistoryForLLM(chat *entity.AiChatEntity, hist []entity.AiChatMessageEntity) []client.ChatMessage {
	rows := hist
	if chat.CompactedUpToCreatedAt != nil {
		filtered := rows[:0:0]
		for i := range rows {
			if rows[i].CreatedAt.After(*chat.CompactedUpToCreatedAt) {
				filtered = append(filtered, rows[i])
			}
		}
		rows = filtered
	}
	out := make([]client.ChatMessage, 0, len(rows)+1)
	if chat.CompactionSummary != nil && strings.TrimSpace(*chat.CompactionSummary) != "" {
		out = append(out, client.ChatMessage{
			Role: ChatRoleSystem,
			Content: "EARLIER CONVERSATION SUMMARY (replaces older messages, keep using these facts):\n" +
				*chat.CompactionSummary,
		})
	}
	out = append(out, s.historyRowsToChatMessages(rows)...)
	return out
}

func (s *aiChatTurnServiceImpl) maybeCompactBefore(ctx context.Context, chat *entity.AiChatEntity, hist []entity.AiChatMessageEntity) (bool, map[string]interface{}) {
	if chat.LastTurnTokens == nil {
		return false, nil
	}
	cfg := s.sis.GetAiChatConfig()
	pct := cfg.CompactAtContextPercent
	ctxWindow := s.llm.ContextWindowSize()
	threshold := ctxWindow * pct / 100
	if *chat.LastTurnTokens < threshold {
		return false, nil
	}

	keep := minRecentMessagesAfterCompaction
	if len(hist) <= keep {
		return false, nil
	}
	headEnd := len(hist) - keep
	headSlice := hist[:headEnd]

	if chat.CompactedUpToCreatedAt != nil &&
		!headSlice[len(headSlice)-1].CreatedAt.After(*chat.CompactedUpToCreatedAt) {
		return false, nil
	}

	headView := s.historyRowsToChatMessages(headSlice)
	summary := s.summarizeForCompaction(ctx, chat.CompactionSummary, headView)
	if strings.TrimSpace(summary) == "" {
		return false, nil
	}
	boundary := headSlice[len(headSlice)-1].CreatedAt
	chat.CompactionSummary = &summary
	chat.CompactedUpToCreatedAt = &boundary
	chat.LastTurnTokens = nil
	if err := s.repo.UpdateChat(ctx, chat); err != nil {
		log.WithField("chatId", chat.ID).Warnf("ai-chat: persist compaction failed: %v", err)
		return false, nil
	}
	return true, map[string]interface{}{
		aiChatSSEFieldType: aiChatSSEContextCompacted,
		"compactedUpTo":   boundary.UTC().Format(time.RFC3339),
		"summaryPreview":  truncateRunes(summary, maxCompactionSummaryPreviewRunes),
		"messagesBefore":  len(hist),
		"messagesKeptRaw": keep,
	}
}

func (s *aiChatTurnServiceImpl) buildSystemMessage(ctx context.Context) string {
	mcpWorkspace := s.sis.GetAiMCPConfig().Workspace
	if mcpWorkspace == "" {
		return systemMessageBaseContent
	}

	s.packagesListCache.mu.RLock()
	cachedData := s.packagesListCache.data
	cacheExpired := time.Now().After(s.packagesListCache.expiresAt)
	s.packagesListCache.mu.RUnlock()

	if cachedData != "" && !cacheExpired {
		log.Debugf("Using cached api-packages-list resource (expires at: %v)", s.packagesListCache.expiresAt)
		return systemMessageBaseContent + "\n\nCURRENT WORKSPACE PACKAGES (from api-packages-list resource):\n" + cachedData
	}

	log.Debugf("Cache expired or empty, fetching fresh api-packages-list resource")
	resourceContents, err := s.mcpService.GetPackagesList(ctx, mcpWorkspace)
	if err != nil {
		log.Warnf("Failed to read api-packages-list resource: %v", err)
		if cachedData != "" {
			log.Debugf("Using expired cache as fallback")
			return systemMessageBaseContent + "\n\nCURRENT WORKSPACE PACKAGES (from api-packages-list resource):\n" + cachedData
		}
		return systemMessageBaseContent
	}

	var resourceData string
	if len(resourceContents) > 0 {
		if textContent, ok := resourceContents[0].(*mcpgo.TextResourceContents); ok {
			resourceData = textContent.Text
		}
	}

	if resourceData != "" {
		s.packagesListCache.mu.Lock()
		s.packagesListCache.data = resourceData
		s.packagesListCache.expiresAt = time.Now().Add(PackagesListCacheTTL)
		s.packagesListCache.mu.Unlock()
		log.Debugf("Updated api-packages-list cache (expires at: %v)", s.packagesListCache.expiresAt)
		return systemMessageBaseContent + "\n\nCURRENT WORKSPACE PACKAGES (from api-packages-list resource):\n" + resourceData
	}
	return systemMessageBaseContent
}

func (s *aiChatTurnServiceImpl) generateChatTitle(ctx context.Context, userText, assistantText string) string {
	const sysPrompt = `You write very short (no more than 6 words) chat titles.
Return ONLY the title text - no quotes, no markdown, no trailing punctuation.
Capture the main topic or task of the conversation.`
	prompt := "User asked: " + truncateRunes(userText, MaxTitlePromptRunesPerSide) +
		"\n\nAssistant replied: " + truncateRunes(assistantText, MaxTitlePromptRunesPerSide)

	resp, err := s.llm.Execute(ctx, client.LLMRequest{
		SystemMessage: sysPrompt,
		Messages:      []client.ChatMessage{{Role: ChatRoleUser, Content: prompt}},
		CorrelationID: AiChatCorrelationIDFromContext(ctx),
	})
	if err != nil || resp == nil {
		log.Warnf("ai-chat: generateChatTitle LLM call failed: %v", err)
		return ""
	}
	title := strings.TrimSpace(resp.AssistantText)
	title = strings.Trim(title, "\"'`")
	if len(title) > MaxGeneratedChatTitleRunes {
		title = strings.TrimSpace(string([]rune(title)[:MaxGeneratedChatTitleRunes]))
	}
	return title
}

func (s *aiChatTurnServiceImpl) summarizeForCompaction(ctx context.Context, prior *string, msgs []client.ChatMessage) string {
	if len(msgs) == 0 {
		if prior != nil {
			return *prior
		}
		return ""
	}
	const sysPrompt = `You are summarizing the EARLIER part of an ongoing assistant conversation.
The summary will be substituted for these messages on the next turn so the model still has the relevant context.
Capture concretely:
	- the user's overall goal and constraints
	- decisions already made and facts already established
	- any package/version/operation IDs and tool results that the user is still working with
Return plain text, 4-12 sentences, no markdown headings.`
	var b strings.Builder
	if prior != nil && *prior != "" {
		b.WriteString("Existing summary so far:\n")
		b.WriteString(*prior)
		b.WriteString("\n\n---\n\n")
	}
	b.WriteString("New conversation slice to integrate:\n")
	for _, m := range msgs {
		role := m.Role
		if role == "" {
			role = ChatRoleUser
		}
		b.WriteString("[")
		b.WriteString(role)
		b.WriteString("] ")
		b.WriteString(truncateRunes(m.Content, MaxCompactionMessageRunes))
		b.WriteString("\n")
	}
	resp, err := s.llm.Execute(ctx, client.LLMRequest{
		SystemMessage: sysPrompt,
		Messages:      []client.ChatMessage{{Role: ChatRoleUser, Content: b.String()}},
		CorrelationID: AiChatCorrelationIDFromContext(ctx),
	})
	if err != nil || resp == nil {
		log.Warnf("ai-chat: summarizeForCompaction failed: %v", err)
		if prior != nil {
			return *prior
		}
		return ""
	}
	return strings.TrimSpace(resp.AssistantText)
}

func (s *aiChatTurnServiceImpl) scheduleAutoTitle(chatID, userID, userText, assistantText string) {
	utils.SafeAsync(func() {
		ctx, cancel := context.WithTimeout(context.Background(), AutoTitleGenerationTimeout)
		defer cancel()
		title := s.generateChatTitle(ctx, userText, assistantText)
		if strings.TrimSpace(title) == "" {
			log.WithField("chatId", chatID).Warn("ai-chat: title generation returned empty result")
			return
		}
		current, err := s.repo.GetChatByIDForUser(ctx, chatID, userID)
		if err != nil || current == nil {
			return
		}
		if strings.TrimSpace(current.Title) != "" {
			return
		}
		current.Title = title
		if err := s.repo.UpdateChat(ctx, current); err != nil {
			log.WithField("chatId", chatID).Warnf("ai-chat: auto-title persist failed: %v", err)
			return
		}
		log.WithFields(log.Fields{"chatId": chatID, "title": title}).Info("ai-chat: auto-title set")
	})
}
