package utils

import (
	"context"
	"log/slog"

	log "github.com/sirupsen/logrus"
)

const mcpSweepingExpiredSessionMessage = "Sweeping expired session"

type mcpGoLogHandler struct {
	attrs []slog.Attr
}

func (h *mcpGoLogHandler) Enabled(_ context.Context, level slog.Level) bool {
	switch {
	case level >= slog.LevelError:
		return log.IsLevelEnabled(log.ErrorLevel)
	case level >= slog.LevelWarn:
		return log.IsLevelEnabled(log.WarnLevel)
	case level >= slog.LevelInfo:
		return log.IsLevelEnabled(log.InfoLevel)
	case level >= slog.LevelDebug:
		return log.IsLevelEnabled(log.DebugLevel)
	default:
		return log.IsLevelEnabled(log.TraceLevel)
	}
}

func (h *mcpGoLogHandler) Handle(_ context.Context, r slog.Record) error {
	fields := logrusFieldsFromAttrs(h.attrs)
	r.Attrs(func(a slog.Attr) bool {
		fields[a.Key] = a.Value.Any()
		return true
	})

	if r.Message == mcpSweepingExpiredSessionMessage {
		if !log.IsLevelEnabled(log.TraceLevel) {
			return nil
		}
		log.WithFields(fields).Trace(r.Message)
		return nil
	}

	entry := log.WithFields(fields)
	switch {
	case r.Level >= slog.LevelError:
		entry.Error(r.Message)
	case r.Level >= slog.LevelWarn:
		entry.Warn(r.Message)
	case r.Level >= slog.LevelInfo:
		entry.Info(r.Message)
	case r.Level >= slog.LevelDebug:
		entry.Debug(r.Message)
	default:
		entry.Trace(r.Message)
	}
	return nil
}

func (h *mcpGoLogHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	combined := make([]slog.Attr, len(h.attrs), len(h.attrs)+len(attrs))
	copy(combined, h.attrs)
	combined = append(combined, attrs...)
	return &mcpGoLogHandler{attrs: combined}
}

func (h *mcpGoLogHandler) WithGroup(_ string) slog.Handler {
	return h
}

func logrusFieldsFromAttrs(attrs []slog.Attr) log.Fields {
	fields := log.Fields{}
	for _, attr := range attrs {
		fields[attr.Key] = attr.Value.Any()
	}
	return fields
}

func NewMCPGoLogger() *slog.Logger {
	return slog.New(&mcpGoLogHandler{})
}
