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
