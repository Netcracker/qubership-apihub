package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/view"
	mcpgo "github.com/mark3labs/mcp-go/mcp"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/shared"

	log "github.com/sirupsen/logrus"
)

// System message base content for OpenAI chat
const systemMessageBaseContent = `You are a specialized assistant for working with REST API documentation and specifications. Your role is to help users find and understand API operations, endpoints, and their specifications.

IMPORTANT RESTRICTIONS:
- You MUST ONLY help with questions related to REST API documentation, API operations, endpoints, specifications, and related technical topics
- If a user asks about topics unrelated to API documentation (general knowledge, history, current events, personal advice, etc.), you MUST politely decline and explain that you can only help with API-related questions
- Example response for off-topic questions: "I'm sorry, but I specialize in helping with REST API documentation and specifications. I can't help with questions outside of this topic. Can I help you with something about APIs?"

DATA STRUCTURE:
- REST API specifications are organized into packages
- Package ID can serve as a hint to which domain the API belongs
- Each package contains API operations
- Each package can have multiple versions in YYYY.Q format (e.g., 2024.3, 2024.4)

YOUR CAPABILITIES:
- Search for REST API operations using the search_rest_api_operations tool
- Get detailed OpenAPI specifications for specific operations using the get_rest_api_operations_specification tool
- Access the api-packages-list resource to get a list of all available API packages
- Explain API endpoints, request/response formats, and data structures
- Help users understand how to use specific APIs

AVAILABLE RESOURCES:
- api-packages-list: A resource containing the list of all API packages in the system. This resource is useful when:
  * User asks "what packages are available", "show all APIs", "list packages"
  * You need to find package ID by package name (use the ID in tool calls)
  * The resource returns a JSON array with elements containing: name, id, and type (package/group)
  * When searching for operations, use the package ID from this resource in the 'group' parameter of the search_rest_api_operations tool

RESPONSE FORMAT:
- Always use markdown format with well-readable markup (headings, lists, tables, code blocks)
- Respond concisely and in a structured manner
- Return all metadata that tools return
- Convert metadata to markdown links (relative, without baseUrl):
  * packageId -> [packageId](/portal/packages/<packageId>)
  * operationId -> [operationId](/portal/packages/<packageId>/<version>/operations/rest/<operationId>)
- First show a list of operations to choose from, even if only one operation is found
- Use get_rest_api_operations_specification only when user explicitly requests details about a specific operation

Always use available tools and resources when appropriate to provide accurate and up-to-date information about APIs.`

type ChatService interface {
	Chat(ctx context.Context, req view.ChatRequest) (*view.ChatResponse, error)
	ChatStream(ctx context.Context, req view.ChatRequest, writer io.Writer) error
}

func NewChatService(
	systemInfoService SystemInfoService,
	mcpService MCPService,
) ChatService {
	// Create OpenAI client with proxy support and extended timeout
	apiKey := systemInfoService.GetAiChatConfig().OpenAI.ApiKey
	proxyURL := systemInfoService.GetAiChatConfig().OpenAI.ProxyURL

	openAIClient, err := client.NewOpenAIClient(apiKey, proxyURL)
	if err != nil {
		log.Errorf("Failed to create OpenAI client: %v", err)
		panic(fmt.Sprintf("Failed to create OpenAI client: %v", err))
	}
	// Initialize MCP tools (no need to create MCP server - tools are defined statically)
	mcpTools := mcpService.MakeOpenAiMCPTools()

	log.Infof("ChatService initialized with %d MCP tools", len(mcpTools))
	for _, tool := range mcpTools {
		log.Debugf("MCP tool available: %s - %s", tool.Function.Name, tool.Function.Description)
	}

	return &chatServiceImpl{
		systemInfoService: systemInfoService,
		mcpService:        mcpService,
		openAIClient:      openAIClient,
		mcpTools:          mcpTools,
	}
}

type chatServiceImpl struct {
	systemInfoService SystemInfoService
	mcpService        MCPService

	openAIClient openai.Client
	mcpTools     []openAITool

	// Cache for api-packages-list resource
	packagesListCache struct {
		mu        sync.RWMutex
		data      string
		expiresAt time.Time
	}
}

type openAITool struct {
	Type     string         `json:"type"`
	Function openAIFunction `json:"function"`
}

type openAIFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// convertToOpenAIMessageParams converts view.ChatMessage to openai.ChatCompletionMessageParamUnion
func (c *chatServiceImpl) convertToOpenAIMessageParams(messages []view.ChatMessage) []openai.ChatCompletionMessageParamUnion {
	result := make([]openai.ChatCompletionMessageParamUnion, len(messages))
	for i, msg := range messages {
		switch msg.Role {
		case "system":
			result[i] = openai.SystemMessage(msg.Content)
		case "user":
			result[i] = openai.UserMessage(msg.Content)
		case "assistant":
			result[i] = openai.AssistantMessage(msg.Content)
		case "tool":
			// Tool messages need tool_call_id, but we don't have it in view.ChatMessage
			// This will be handled separately when adding tool results
			result[i] = openai.ToolMessage(msg.Content, "")
		default:
			result[i] = openai.UserMessage(msg.Content)
		}
	}
	return result
}

// convertToOpenAIToolParams converts internal openAITool to openai.ChatCompletionToolUnionParam
func (c *chatServiceImpl) convertToOpenAIToolParams(tools []openAITool) []openai.ChatCompletionToolUnionParam {
	result := make([]openai.ChatCompletionToolUnionParam, len(tools))
	for i, tool := range tools {
		// Convert parameters to shared.FunctionParameters
		paramsBytes, _ := json.Marshal(tool.Function.Parameters)
		var params shared.FunctionParameters
		json.Unmarshal(paramsBytes, &params)

		functionDef := shared.FunctionDefinitionParam{
			Name:        tool.Function.Name,
			Description: openai.String(tool.Function.Description),
			Parameters:  params,
		}

		result[i] = openai.ChatCompletionFunctionTool(functionDef)
	}
	return result
}

func (c *chatServiceImpl) Chat(ctx context.Context, req view.ChatRequest) (*view.ChatResponse, error) {
	// Log incoming request - find last user message
	userMessage := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			userMessage = req.Messages[i].Content
			break
		}
	}
	log.Debugf("Chat request received. Last user message: %s", userMessage)

	// Get MCP tools
	mcpTools := c.mcpTools
	log.Debugf("Using %d MCP tools for this request", len(mcpTools))

	// Convert messages
	messages := c.convertToOpenAIMessageParams(req.Messages)

	// Add system message if not present
	hasSystemMessage := false
	for _, msg := range messages {
		if msg.OfSystem != nil {
			hasSystemMessage = true
			break
		}
	}
	if !hasSystemMessage {
		systemContent := c.buildSystemMessage(ctx)
		systemMsg := openai.SystemMessage(systemContent)
		messages = append([]openai.ChatCompletionMessageParamUnion{systemMsg}, messages...)
	}

	// Convert tools
	openAITools := c.convertToOpenAIToolParams(mcpTools)

	// Process tool calls in a loop until we get a final response
	currentMessages := messages
	var finalResponse *openai.ChatCompletion
	maxIterations := 10 // Limit to prevent infinite loops
	var totalUsage openai.CompletionUsage

	for iteration := 0; iteration < maxIterations; iteration++ {
		// Trim message history if it gets too long to avoid context window overflow
		// Keep system message, recent conversation, and all tool-related messages from current session
		currentMessages = c.trimMessageHistoryOpenAIParams(currentMessages, iteration)

		// Build OpenAI request
		openAIReq := openai.ChatCompletionNewParams{
			Model:           shared.ChatModel(c.systemInfoService.GetAiChatConfig().OpenAI.Model),
			Messages:        currentMessages,
			Tools:           openAITools,
			Temperature:     openai.Float(c.systemInfoService.GetAiChatConfig().OpenAI.Temperature),
			ReasoningEffort: convertReasoningEffort(c.systemInfoService.GetAiChatConfig().OpenAI.ReasoningEffort),
			Verbosity:       convertVerbosity(c.systemInfoService.GetAiChatConfig().OpenAI.Verbosity),
		}

		// Make request to OpenAI
		openAIResp, err := c.openAIClient.Chat.Completions.New(ctx, openAIReq)
		if err != nil {
			// Log detailed error information for debugging
			var apiErr *openai.Error
			if errors.As(err, &apiErr) {
				log.WithFields(log.Fields{
					"error_type":     apiErr.Type,
					"error_code":     apiErr.Code,
					"error_message":  apiErr.Message,
					"error_param":    apiErr.Param,
					"status_code":    apiErr.StatusCode,
					"request_url":    apiErr.Request.URL.String(),
					"request_method": apiErr.Request.Method,
					"raw_json":       apiErr.RawJSON(),
				}).Errorf("OpenAI API error: %s %s returned status %d - %s (code: %s, param: %s)",
					apiErr.Request.Method, apiErr.Request.URL.String(),
					apiErr.StatusCode, apiErr.Message, apiErr.Code, apiErr.Param)

				// Log request/response details at debug level
				if log.IsLevelEnabled(log.DebugLevel) {
					log.Debugf("OpenAI request details:\n%s", string(apiErr.DumpRequest(true)))
					log.Debugf("OpenAI response details:\n%s", string(apiErr.DumpResponse(true)))
				}
			} else {
				// Non-API error (network, timeout, etc.)
				log.WithError(err).Errorf("OpenAI request failed with non-API error: %v", err)
			}
			return nil, fmt.Errorf("failed to make request to OpenAI: %w", err)
		}

		if len(openAIResp.Choices) == 0 {
			return nil, fmt.Errorf("no choices in OpenAI response")
		}

		// Accumulate token usage
		totalUsage.PromptTokens += openAIResp.Usage.PromptTokens
		totalUsage.CompletionTokens += openAIResp.Usage.CompletionTokens
		totalUsage.TotalTokens += openAIResp.Usage.TotalTokens

		choice := openAIResp.Choices[0]
		finishReason := choice.FinishReason

		// If no tool calls, we have the final response
		if len(choice.Message.ToolCalls) == 0 || finishReason != "tool_calls" {
			finalResponse = openAIResp
			log.Debugf("Got final response after %d iterations. Finish reason: %s", iteration+1, finishReason)
			break
		}

		// Handle tool calls
		toolCalls := choice.Message.ToolCalls
		log.Debugf("Iteration %d: OpenAI requested %d tool calls", iteration+1, len(toolCalls))

		// Convert tool calls to internal format for execution
		internalToolCalls := make([]struct {
			ID       string `json:"id"`
			Type     string `json:"type"`
			Function struct {
				Name      string `json:"name"`
				Arguments string `json:"arguments"`
			} `json:"function"`
		}, 0, len(toolCalls))

		for i, tc := range toolCalls {
			// Tool calls are union types, check which variant we have
			var toolCallID, toolCallType, functionName, functionArgs string

			// Use type switch to determine the variant
			switch variant := tc.AsAny().(type) {
			case openai.ChatCompletionMessageFunctionToolCall:
				toolCallID = variant.ID
				toolCallType = string(variant.Type)
				functionName = variant.Function.Name
				functionArgs = variant.Function.Arguments
			case openai.ChatCompletionMessageCustomToolCall:
				// Custom tool call - not supported for now
				log.Warnf("Tool call %d: Custom tool call not supported", i+1)
				continue
			default:
				log.Warnf("Tool call %d: Unknown tool call type", i+1)
				continue
			}

			log.Debugf("Tool call %d: %s with arguments: %s", i+1, functionName, functionArgs)

			internalToolCalls = append(internalToolCalls, struct {
				ID       string `json:"id"`
				Type     string `json:"type"`
				Function struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				} `json:"function"`
			}{
				ID:   toolCallID,
				Type: toolCallType,
				Function: struct {
					Name      string `json:"name"`
					Arguments string `json:"arguments"`
				}{
					Name:      functionName,
					Arguments: functionArgs,
				},
			})
		}

		// Execute tool calls and get results
		toolResults, err := c.executeToolCalls(ctx, internalToolCalls)
		if err != nil {
			log.Errorf("Failed to execute tool calls: %v", err)
			// Continue with empty tool results
			toolResults = make([]string, len(internalToolCalls))
		}
		if len(toolResults) > 0 {
			log.Debugf("Tool calls executed successfully, got %d results", len(toolResults))

			// Convert tool calls from response to param format
			toolCallParams := make([]openai.ChatCompletionMessageToolCallUnionParam, 0, len(toolCalls))
			for _, tc := range toolCalls {
				toolCallParams = append(toolCallParams, tc.ToParam())
			}

			// Create assistant message with tool calls (required by OpenAI)
			assistantContent := choice.Message.Content
			assistantMsgParam := openai.ChatCompletionAssistantMessageParam{
				Content: openai.ChatCompletionAssistantMessageParamContentUnion{
					OfString: openai.String(assistantContent),
				},
				ToolCalls: toolCallParams,
			}
			assistantMsg := openai.ChatCompletionMessageParamUnion{OfAssistant: &assistantMsgParam}

			// Add tool result messages (each must have tool_call_id)
			toolMessages := make([]openai.ChatCompletionMessageParamUnion, 0, len(internalToolCalls))
			for i, internalToolCall := range internalToolCalls {
				toolMessages = append(toolMessages, openai.ToolMessage(toolResults[i], internalToolCall.ID))
			}

			// Build next iteration messages: current messages + assistant with tool_calls + tool results
			currentMessages = append(currentMessages, assistantMsg)
			currentMessages = append(currentMessages, toolMessages...)
		} else {
			// If no tool results, break to avoid infinite loop
			log.Warnf("No tool results, breaking tool call loop")
			finalResponse = openAIResp
			break
		}
	}

	if finalResponse == nil {
		return nil, fmt.Errorf("reached maximum iterations (%d) without final response", maxIterations)
	}

	choice := finalResponse.Choices[0]
	content := choice.Message.Content
	responseMessage := view.ChatMessage{
		Role:    string(choice.Message.Role),
		Content: content,
	}

	log.Debugf("Chat response generated after processing. Content length: %d, Total tokens used: %d", len(responseMessage.Content), totalUsage.TotalTokens)

	return &view.ChatResponse{
		Message: responseMessage,
		Usage: &view.ChatUsage{
			PromptTokens:     int(totalUsage.PromptTokens),
			CompletionTokens: int(totalUsage.CompletionTokens),
			TotalTokens:      int(totalUsage.TotalTokens),
		},
	}, nil
}

func (c *chatServiceImpl) ChatStream(ctx context.Context, req view.ChatRequest, writer io.Writer) error {
	// Log incoming request - find last user message
	userMessage := ""
	for i := len(req.Messages) - 1; i >= 0; i-- {
		if req.Messages[i].Role == "user" {
			userMessage = req.Messages[i].Content
			break
		}
	}
	log.Debugf("Chat stream request received. Last user message: %s", userMessage)

	// Get MCP tools
	mcpTools := c.mcpTools
	log.Debugf("Using %d MCP tools for this stream request", len(mcpTools))

	// Convert messages
	messages := c.convertToOpenAIMessageParams(req.Messages)

	// Add system message if not present
	hasSystemMessage := false
	for _, msg := range messages {
		if msg.OfSystem != nil {
			hasSystemMessage = true
			break
		}
	}
	if !hasSystemMessage {
		systemContent := c.buildSystemMessage(ctx)
		systemMsg := openai.SystemMessage(systemContent)
		messages = append([]openai.ChatCompletionMessageParamUnion{systemMsg}, messages...)
	}

	// Convert tools
	openAITools := c.convertToOpenAIToolParams(mcpTools)

	// Build OpenAI request
	openAIReq := openai.ChatCompletionNewParams{
		Model:           shared.ChatModel(c.systemInfoService.GetAiChatConfig().OpenAI.Model),
		Messages:        messages,
		Tools:           openAITools,
		Temperature:     openai.Float(c.systemInfoService.GetAiChatConfig().OpenAI.Temperature),
		ReasoningEffort: convertReasoningEffort(c.systemInfoService.GetAiChatConfig().OpenAI.ReasoningEffort),
		Verbosity:       convertVerbosity(c.systemInfoService.GetAiChatConfig().OpenAI.Verbosity),
	}

	// Create stream
	stream := c.openAIClient.Chat.Completions.NewStreaming(ctx, openAIReq)
	defer stream.Close()

	// Stream response
	for stream.Next() {
		chunk := stream.Current()
		if len(chunk.Choices) > 0 {
			choice := chunk.Choices[0]
			delta := choice.Delta.Content
			if delta != "" {
				finishReason := choice.FinishReason
				streamChunk := view.ChatStreamChunk{
					Delta: delta,
					Done:  finishReason != "",
				}
				chunkJSON, _ := json.Marshal(streamChunk)
				writer.Write(chunkJSON)
				writer.Write([]byte("\n"))
			}
		}
	}

	if err := stream.Err(); err != nil {
		// Log detailed error information for debugging
		var apiErr *openai.Error
		if errors.As(err, &apiErr) {
			log.WithFields(log.Fields{
				"error_type":     apiErr.Type,
				"error_code":     apiErr.Code,
				"error_message":  apiErr.Message,
				"error_param":    apiErr.Param,
				"status_code":    apiErr.StatusCode,
				"request_url":    apiErr.Request.URL.String(),
				"request_method": apiErr.Request.Method,
				"raw_json":       apiErr.RawJSON(),
			}).Errorf("OpenAI stream API error: %s %s returned status %d - %s (code: %s, param: %s)",
				apiErr.Request.Method, apiErr.Request.URL.String(),
				apiErr.StatusCode, apiErr.Message, apiErr.Code, apiErr.Param)

			// Log request/response details at debug level
			if log.IsLevelEnabled(log.DebugLevel) {
				log.Debugf("OpenAI stream request details:\n%s", string(apiErr.DumpRequest(true)))
				log.Debugf("OpenAI stream response details:\n%s", string(apiErr.DumpResponse(true)))
			}
		} else {
			// Non-API error (network, timeout, etc.)
			log.WithError(err).Errorf("OpenAI stream failed with non-API error: %v", err)
		}
		return fmt.Errorf("stream error: %w", err)
	}

	return nil
}

/*func (c *chatServiceImpl) initMCPTools() {
	openAIToolsRaw := GetToolsForOpenAI()
	toolsList := make([]openAITool, len(openAIToolsRaw))
	for i, toolRaw := range openAIToolsRaw {
		functionRaw := toolRaw["function"].(map[string]interface{})
		toolsList[i] = openAITool{
			Type: toolRaw["type"].(string),
			Function: openAIFunction{
				Name:        functionRaw["name"].(string),
				Description: functionRaw["description"].(string),
				Parameters:  functionRaw["parameters"].(map[string]interface{}),
			},
		}
	}

	c.mcpTools = toolsList
}*/

// buildSystemMessage builds system message with MCP resource data included
func (c *chatServiceImpl) buildSystemMessage(ctx context.Context) string {
	mcpWorkspace := c.systemInfoService.GetAiMCPConfig().Workspace
	if mcpWorkspace == "" {
		return systemMessageBaseContent
	}

	// Check cache first
	c.packagesListCache.mu.RLock()
	cachedData := c.packagesListCache.data
	cacheExpired := time.Now().After(c.packagesListCache.expiresAt)
	c.packagesListCache.mu.RUnlock()

	// If cache is valid, use it
	if cachedData != "" && !cacheExpired {
		log.Debugf("Using cached api-packages-list resource (expires at: %v)", c.packagesListCache.expiresAt)
		return systemMessageBaseContent + "\n\nCURRENT WORKSPACE PACKAGES (from api-packages-list resource):\n" + cachedData
	}

	// Cache expired or empty, fetch fresh data
	log.Debugf("Cache expired or empty, fetching fresh api-packages-list resource")
	resourceContents, err := c.mcpService.GetPackagesList(ctx, mcpWorkspace)
	if err != nil {
		log.Warnf("Failed to read api-packages-list resource: %v", err)
		// If we have cached data even though expired, use it as fallback
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

	// Update cache with TTL of 1 day
	if resourceData != "" {
		c.packagesListCache.mu.Lock()
		c.packagesListCache.data = resourceData
		c.packagesListCache.expiresAt = time.Now().Add(24 * time.Hour)
		c.packagesListCache.mu.Unlock()
		log.Debugf("Updated api-packages-list cache (expires at: %v)", c.packagesListCache.expiresAt)
	}

	if resourceData != "" {
		return systemMessageBaseContent + "\n\nCURRENT WORKSPACE PACKAGES (from api-packages-list resource):\n" + resourceData
	}

	return systemMessageBaseContent
}

func (c *chatServiceImpl) executeToolCalls(ctx context.Context, toolCalls []struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}) ([]string, error) {
	results := make([]string, len(toolCalls))

	for i, toolCall := range toolCalls {
		log.Debugf("Executing tool call: %s with args: %s", toolCall.Function.Name, toolCall.Function.Arguments)

		// Use MCP handlers to execute tool
		var args map[string]interface{}
		if err := json.Unmarshal([]byte(toolCall.Function.Arguments), &args); err != nil {
			log.Errorf("Failed to parse tool arguments: %v", err)
			results[i] = fmt.Sprintf("Error parsing arguments: %v", err)
			continue
		}

		// Create MCP CallToolRequest using wrapper
		argsBytes, _ := json.Marshal(args)
		mcpReqWrapper := view.MCPToolRequestWrapper{
			Name:      toolCall.Function.Name,
			Arguments: argsBytes,
		}

		// Convert wrapper to mcp.CallToolRequest
		mcpReq := mcpReqWrapper.ToCallToolRequest()

		// Execute via shared MCP tool handlers
		var result *mcpgo.CallToolResult
		var err error
		switch toolCall.Function.Name {
		case "search_rest_api_operations":
			result, err = c.mcpService.ExecuteSearchTool(ctx, mcpReq)
		case "get_rest_api_operations_specification":
			result, err = c.mcpService.ExecuteGetSpecTool(ctx, mcpReq)
		default:
			results[i] = fmt.Sprintf("Unknown tool: %s", toolCall.Function.Name)
			continue
		}

		if err != nil {
			log.Errorf("MCP tool execution failed: %v", err)
			results[i] = fmt.Sprintf("Error: %v", err)
			continue
		}

		// Log MCP tool response at debug level
		resultJSON, _ := json.Marshal(result.Content)
		log.Debugf("MCP tool %s returned result (IsError=%v, Content length=%d): %s",
			toolCall.Function.Name, result.IsError, len(result.Content), string(resultJSON))

		// Convert result to string
		if result.IsError {
			if len(result.Content) > 0 {
				// Content is an array of mcpgo.Content, which can be Text or Resource
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
				results[i] = "Unknown error from tool"
			}
		} else {
			// Convert structured result to JSON string
			resultJSON, err := json.Marshal(result.Content)
			if err != nil {
				log.Errorf("Failed to marshal tool result: %v", err)
				results[i] = fmt.Sprintf("Error marshaling result: %v", err)
			} else {
				results[i] = string(resultJSON)
				log.Debugf("Tool %s executed successfully, result length: %d", toolCall.Function.Name, len(results[i]))
			}
		}

	}

	return results, nil
}

// trimMessageHistoryOpenAIParams trims the message history to prevent context window overflow
// Strategy:
// 1. Always keep system message (first message if it's system)
// 2. Keep recent conversation messages (last N user/assistant pairs)
// 3. Keep all tool-related messages (assistant with tool_calls and tool responses) from current session
// 4. Maximum messages limit: 50 (configurable)
func (c *chatServiceImpl) trimMessageHistoryOpenAIParams(messages []openai.ChatCompletionMessageParamUnion, currentIteration int) []openai.ChatCompletionMessageParamUnion {
	const maxMessages = 50             // Maximum number of messages to keep
	const recentConversationPairs = 10 // Number of recent user/assistant pairs to keep

	if len(messages) <= maxMessages {
		return messages
	}

	log.Debugf("Trimming message history: %d messages -> max %d", len(messages), maxMessages)

	// Find system message (usually first)
	var systemMsg *openai.ChatCompletionMessageParamUnion
	var systemMsgIndex = -1
	for i, msg := range messages {
		if msg.OfSystem != nil {
			systemMsg = &messages[i]
			systemMsgIndex = i
			break
		}
	}

	// Separate messages into categories
	var toolMessages []openai.ChatCompletionMessageParamUnion         // assistant with tool_calls and tool responses
	var conversationMessages []openai.ChatCompletionMessageParamUnion // user and assistant without tool_calls

	// Start from after system message
	startIdx := 0
	if systemMsgIndex >= 0 {
		startIdx = systemMsgIndex + 1
	}

	for i := startIdx; i < len(messages); i++ {
		msg := messages[i]

		// Tool-related messages: tool role or assistant (we keep all assistants as they might have tool calls)
		isToolMessage := msg.OfTool != nil || msg.OfAssistant != nil
		if isToolMessage {
			toolMessages = append(toolMessages, msg)
		} else {
			// Regular conversation messages
			conversationMessages = append(conversationMessages, msg)
		}
	}

	// Keep only recent conversation pairs
	var trimmedConversation []openai.ChatCompletionMessageParamUnion
	if len(conversationMessages) > recentConversationPairs*2 {
		// Keep last N pairs (each pair = user + assistant)
		trimmedConversation = conversationMessages[len(conversationMessages)-recentConversationPairs*2:]
		log.Debugf("Trimmed conversation: kept last %d pairs (%d messages)", recentConversationPairs, len(trimmedConversation))
	} else {
		trimmedConversation = conversationMessages
	}

	// Reconstruct message history: system + recent conversation + all tool messages
	result := make([]openai.ChatCompletionMessageParamUnion, 0, len(trimmedConversation)+len(toolMessages)+1)

	// Add system message first if exists
	if systemMsg != nil {
		result = append(result, *systemMsg)
	}

	// Add recent conversation
	result = append(result, trimmedConversation...)

	// Add all tool messages (they are important for current session context)
	result = append(result, toolMessages...)

	log.Debugf("Message history trimmed: %d -> %d messages (system: %v, conversation: %d, tool: %d)",
		len(messages), len(result), systemMsg != nil, len(trimmedConversation), len(toolMessages))

	return result
}

// Helper functions to convert string values from config to OpenAI library types

// convertReasoningEffort converts string value from config to shared.ReasoningEffort type
func convertReasoningEffort(value string) shared.ReasoningEffort {
	switch value {
	case "minimal":
		return shared.ReasoningEffortMinimal
	case "low":
		return shared.ReasoningEffortLow
	case "medium":
		return shared.ReasoningEffortMedium
	case "high":
		return shared.ReasoningEffortHigh
	default:
		return shared.ReasoningEffortMedium // default fallback
	}
}

// convertVerbosity converts string value from config to ChatCompletionNewParamsVerbosity type
func convertVerbosity(value string) openai.ChatCompletionNewParamsVerbosity {
	switch value {
	case "low":
		return openai.ChatCompletionNewParamsVerbosityLow
	case "medium":
		return openai.ChatCompletionNewParamsVerbosityMedium
	case "high":
		return openai.ChatCompletionNewParamsVerbosityHigh
	default:
		return openai.ChatCompletionNewParamsVerbosityMedium // default fallback
	}
}
