package logger

import (
	"context"
	"fmt"

	log "github.com/sirupsen/logrus"
)

func getJobPrefix(ctx context.Context) string {
	jobType := ctx.Value("jobType")
	jobId := ctx.Value("jobId")

	if jobType != nil && jobId != nil {
		return fmt.Sprintf("[%s] [id=%s] ", jobType, jobId)
	}
	return ""
}

func Debugf(ctx context.Context, format string, args ...interface{}) {
	log.Debug(getJobPrefix(ctx) + fmt.Sprintf(format, args...))
}

func Debug(ctx context.Context, args ...interface{}) {
	log.Debug(getJobPrefix(ctx) + fmt.Sprint(args...))
}

func Infof(ctx context.Context, format string, args ...interface{}) {
	log.Info(getJobPrefix(ctx) + fmt.Sprintf(format, args...))
}

func Info(ctx context.Context, args ...interface{}) {
	log.Info(getJobPrefix(ctx) + fmt.Sprint(args...))
}

func Warnf(ctx context.Context, format string, args ...interface{}) {
	log.Warn(getJobPrefix(ctx) + fmt.Sprintf(format, args...))
}

func Warn(ctx context.Context, args ...interface{}) {
	log.Warn(getJobPrefix(ctx) + fmt.Sprint(args...))
}

func Errorf(ctx context.Context, format string, args ...interface{}) {
	log.Error(getJobPrefix(ctx) + fmt.Sprintf(format, args...))
}

func Error(ctx context.Context, args ...interface{}) {
	log.Error(getJobPrefix(ctx) + fmt.Sprint(args...))
}

func Tracef(ctx context.Context, format string, args ...interface{}) {
	log.Trace(getJobPrefix(ctx) + fmt.Sprintf(format, args...))
}

func Trace(ctx context.Context, args ...interface{}) {
	log.Trace(getJobPrefix(ctx) + fmt.Sprint(args...))
}
