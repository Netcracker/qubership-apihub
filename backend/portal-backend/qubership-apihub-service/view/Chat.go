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

package view

// ChatMessage represents a single message in the chat conversation
type ChatMessage struct {
	Role    string `json:"role" validate:"required,oneof=user assistant system"`
	Content string `json:"content" validate:"required"`
}

// ChatRequest represents a request to the chat API
type ChatRequest struct {
	Messages []ChatMessage `json:"messages" validate:"required,min=1"`
	Stream   bool           `json:"stream,omitempty"`
}

// ChatResponse represents a response from the chat API
type ChatResponse struct {
	Message ChatMessage `json:"message"`
	Usage   *ChatUsage   `json:"usage,omitempty"`
}

// ChatUsage represents token usage information
type ChatUsage struct {
	PromptTokens     int `json:"promptTokens"`
	CompletionTokens int `json:"completionTokens"`
	TotalTokens      int `json:"totalTokens"`
}

// ChatStreamChunk represents a chunk in streaming response
type ChatStreamChunk struct {
	Delta   string `json:"delta"`
	Done    bool   `json:"done"`
	Usage   *ChatUsage `json:"usage,omitempty"`
}

