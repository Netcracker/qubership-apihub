package utils

import (
	"bytes"
	"testing"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestMCPGoLogger_SweepingExpiredSessionAtTrace(t *testing.T) {
	var buf bytes.Buffer
	prevOut := log.StandardLogger().Out
	prevLevel := log.GetLevel()
	t.Cleanup(func() {
		log.SetOutput(prevOut)
		log.SetLevel(prevLevel)
	})

	log.SetOutput(&buf)
	log.SetLevel(log.InfoLevel)

	logger := NewMCPGoLogger()
	logger.Info("Sweeping expired session", "session", "mcp-session-test")

	assert.Empty(t, buf.String())

	log.SetLevel(log.TraceLevel)
	logger.Info("Sweeping expired session", "session", "mcp-session-test")

	assert.Contains(t, buf.String(), "Sweeping expired session")
	assert.Contains(t, buf.String(), "mcp-session-test")
}

func TestMCPGoLogger_OtherInfoMessagesStayAtInfo(t *testing.T) {
	var buf bytes.Buffer
	prevOut := log.StandardLogger().Out
	prevLevel := log.GetLevel()
	t.Cleanup(func() {
		log.SetOutput(prevOut)
		log.SetLevel(prevLevel)
	})

	log.SetOutput(&buf)
	log.SetLevel(log.InfoLevel)

	logger := NewMCPGoLogger()
	logger.Info("Delivered sampling response", "session", "mcp-session-test", "request", 1)

	assert.Contains(t, buf.String(), "Delivered sampling response")
	assert.Contains(t, buf.String(), "mcp-session-test")
}

func TestMCPGoLogger_ErrorMessagesStayAtError(t *testing.T) {
	var buf bytes.Buffer
	prevOut := log.StandardLogger().Out
	prevLevel := log.GetLevel()
	t.Cleanup(func() {
		log.SetOutput(prevOut)
		log.SetLevel(prevLevel)
	})

	log.SetOutput(&buf)
	log.SetLevel(log.InfoLevel)

	logger := NewMCPGoLogger()
	logger.Error("Failed to write response", "err", assert.AnError)

	assert.Contains(t, buf.String(), "Failed to write response")
}
