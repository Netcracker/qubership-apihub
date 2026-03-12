package client

import (
	"crypto/tls"
	"net/http"
	"time"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

// NewOpenAIClient creates a new OpenAI client configured for OpenAI API requests
// with proxy support, insecure skip verify, extended timeout and API key
func NewOpenAIClient(apiKey, proxyURL string) (openai.Client, error) {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   20 * time.Minute, // 20 minutes timeout
	}

	// Create OpenAI client with custom HTTP client
	opts := []option.RequestOption{
		option.WithAPIKey(apiKey),
		option.WithHTTPClient(httpClient),
	}

	if proxyURL != "" {
		opts = append(opts, option.WithBaseURL(proxyURL))
	}

	client := openai.NewClient(opts...)

	return client, nil
}
