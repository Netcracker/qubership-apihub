package service

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/Netcracker/qubership-apihub-backend/qubership-apihub-service/client"
	mcpgo "github.com/mark3labs/mcp-go/mcp"
)

const (
	toolNameStartIDSGeneration = "start_ids_generation"
	toolNameSaveGeneratedFile  = "save_generated_file"
)

const (
	maxIDSUserInputBytes      = 64 * 1024
	maxSavedGeneratedFileSize = 2 * 1024 * 1024
)

func makeIDSChatTools() []client.LLMTool {
	return []client.LLMTool{
		{
			Name: toolNameStartIDSGeneration,
			Description: `Begin authoring an Integration Design Specification (IDS) document. The tool returns:

* the canonical IDS markdown template,
* the step-by-step authoring rules (including mandatory APIHub lookups),
* a hand-off contract telling you exactly which tool to call when the document is complete (save_generated_file).

Call this tool ONLY when the user has explicitly asked you to generate / create / draft / build an IDS or design document for an integration scenario. Pass the user's natural-language request verbatim (or lightly cleaned of greetings) as user_input. Do NOT call this tool for general questions about APIs.

After receiving the kit, you MUST follow the rules end-to-end (search APIHub for every API referenced by the user, fill the template) and then call save_generated_file with the resulting markdown.`,
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"user_input": map[string]interface{}{
						"type":        "string",
						"description": "The user's natural-language request describing the integration scenario, the systems involved, and the APIs to integrate. Pass the relevant text from the user's message (you may strip greetings/polish but keep the substance verbatim).",
						"minLength":   1,
					},
				},
				"required": []string{"user_input"},
			},
		},
		{
			Name: toolNameSaveGeneratedFile,
			Description: `Persist a Markdown file generated during this chat turn so the user can download it. The tool stores the file on the server and returns a Markdown link of the form [<filename>](<download_url>) which you MUST embed verbatim in your final user-facing reply.

USAGE RULES:
* Only call this tool as the LAST step of an IDS authoring flow (after start_ids_generation has been called and you have produced the full IDS document).
* Pass the COMPLETE markdown content via the content argument; do not abbreviate or drop sections.
* Choose a concise, ASCII-only filename ending in .md, for example "IDS_TCS_Reserve_SIM.md".
* Do NOT inline the file body in chat -- the user receives it via the link.`,
			Parameters: map[string]interface{}{
				"type": "object",
				"properties": map[string]interface{}{
					"filename": map[string]interface{}{
						"type":        "string",
						"description": "ASCII-only file name ending in .md, e.g. IDS_<3rdPartySystemAbbrev>.md. No spaces or path separators.",
						"minLength":   1,
						"maxLength":   MaxGeneratedFilenameRunes,
					},
					"content": map[string]interface{}{
						"type":        "string",
						"description": "Full Markdown body to save. The file is served as text/markdown.",
						"minLength":   1,
					},
				},
				"required": []string{"filename", "content"},
			},
		},
	}
}

func (s *aiChatTurnServiceImpl) executeStartIDSGeneration(_ context.Context, args map[string]interface{}) (*mcpgo.CallToolResult, error) {
	userInput, _ := args["user_input"].(string)
	userInput = strings.TrimSpace(userInput)
	if userInput == "" {
		return mcpgo.NewToolResultError("user_input is required"), nil
	}
	if len(userInput) > maxIDSUserInputBytes {
		return mcpgo.NewToolResultError(fmt.Sprintf("user_input is too long (%d bytes, max %d)", len(userInput), maxIDSUserInputBytes)), nil
	}
	kit, err := s.mcpService.IDSAuthoringKit(userInput)
	if err != nil {
		return mcpgo.NewToolResultError(fmt.Sprintf("failed to assemble IDS authoring kit: %v", err)), nil
	}
	return mcpgo.NewToolResultText(kit), nil
}

func (s *aiChatTurnServiceImpl) executeSaveGeneratedFile(ctx context.Context, args map[string]interface{}) (*mcpgo.CallToolResult, error) {
	if s.generatedFiles == nil || s.mintFileToken == nil {
		return mcpgo.NewToolResultError("generated file service is not configured"), nil
	}
	turn, ok := AiChatTurnFromContext(ctx)
	if !ok || turn.UserID == "" {
		return mcpgo.NewToolResultError("no user context available for save_generated_file"), nil
	}

	filename, _ := args["filename"].(string)
	content, _ := args["content"].(string)
	filename = strings.TrimSpace(filename)
	if filename == "" {
		return mcpgo.NewToolResultError("filename is required"), nil
	}
	if utf8.RuneCountInString(filename) > MaxGeneratedFilenameRunes {
		return mcpgo.NewToolResultError(fmt.Sprintf("filename is too long (max %d characters)", MaxGeneratedFilenameRunes)), nil
	}
	filename = sanitizeChatToolFilename(filename)
	if filename == "" {
		return mcpgo.NewToolResultError("filename must contain ASCII letters/digits"), nil
	}
	if content == "" {
		return mcpgo.NewToolResultError("content is required"), nil
	}
	if len(content) > maxSavedGeneratedFileSize {
		return mcpgo.NewToolResultError(fmt.Sprintf("content is too large (%d bytes, max %d)", len(content), maxSavedGeneratedFileSize)), nil
	}

	row, relURL, err := s.generatedFiles.SaveFile(ctx, EphemeralFileSaveInput{
		UserID:   turn.UserID,
		Filename: filename,
		MimeType: MimeTypeMarkdown,
		Reader:   strings.NewReader(content),
	})
	if err != nil {
		return mcpgo.NewToolResultError(fmt.Sprintf("failed to save generated file: %v", err)), nil
	}

	ttl := time.Until(row.ExpiresAt)
	if ttl <= 0 {
		return mcpgo.NewToolResultError("generated file already expired"), nil
	}
	tok, err := s.mintFileToken(turn.UserID, row.ID, ttl)
	if err != nil {
		return mcpgo.NewToolResultError(fmt.Sprintf("failed to mint download token: %v", err)), nil
	}

	link := fmt.Sprintf("[%s](%s?token=%s)", row.Filename, relURL, tok)
	payload := map[string]interface{}{
		"fileId":      row.ID,
		"filename":    row.Filename,
		"url":         relURL,
		"markdown":    link,
		"expiresAt":   row.ExpiresAt.UTC().Format(time.RFC3339),
		"sizeBytes":   row.SizeBytes,
		"instruction": "Embed the value of `markdown` verbatim in your final user-facing reply so the user can download the file.",
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return mcpgo.NewToolResultError(fmt.Sprintf("failed to marshal save_generated_file result: %v", err)), nil
	}
	return mcpgo.NewToolResultText(string(body)), nil
}

func sanitizeChatToolFilename(name string) string {
	name = filepath.Base(name)
	if name == "." || name == ".." || name == "/" || name == "\\" {
		return ""
	}
	var b strings.Builder
	for _, r := range name {
		switch {
		case r >= 'a' && r <= 'z',
			r >= 'A' && r <= 'Z',
			r >= '0' && r <= '9',
			r == '.', r == '-', r == '_':
			b.WriteRune(r)
		default:
			b.WriteByte('_')
		}
	}
	cleaned := strings.Trim(b.String(), "._")
	if cleaned == "" {
		return ""
	}
	return cleaned
}

