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

// Package logging holds the log line format shared by all APIHUB services.
package logging

import (
	"bytes"
	"fmt"
	stdlog "log"
	"sort"
	"strings"

	log "github.com/sirupsen/logrus"
)

// TimestampFormat is the UTC timestamp layout of a log line.
const TimestampFormat = "2006-01-02T15:04:05.000"

// Formatter writes a logrus entry as one line of the APIHUB log format:
//
//	[2006-01-02T15:04:05.000] [INFO] [request_id=<id>] [tenant_id=] [thread_id=] [class=] <message>
//
// The request ID comes from the entry context (see RequestIDMiddleware). Go has no thread or class
// to report, so those fields stay empty. Entry fields follow the message as key=value pairs.
type Formatter struct{}

// NewFormatter returns the APIHUB log line formatter.
func NewFormatter() *Formatter {
	return &Formatter{}
}

// Format implements logrus.Formatter.
func (f *Formatter) Format(entry *log.Entry) ([]byte, error) {
	b := entry.Buffer
	if b == nil {
		b = &bytes.Buffer{}
	}
	fmt.Fprintf(b, "[%s] [%s] [request_id=%s] [tenant_id=] [thread_id=] [class=] %s",
		entry.Time.UTC().Format(TimestampFormat),
		levelName(entry.Level),
		RequestIDFromContext(entry.Context),
		strings.TrimSuffix(entry.Message, "\n"))
	writeFields(b, entry.Data)
	b.WriteByte('\n')
	return b.Bytes(), nil
}

func levelName(level log.Level) string {
	switch level {
	case log.PanicLevel:
		return "PANIC"
	case log.FatalLevel:
		return "FATAL"
	case log.ErrorLevel:
		return "ERROR"
	case log.WarnLevel:
		return "WARN"
	case log.DebugLevel:
		return "DEBUG"
	case log.TraceLevel:
		return "TRACE"
	default:
		return "INFO"
	}
}

func writeFields(b *bytes.Buffer, data log.Fields) {
	keys := make([]string, 0, len(data))
	for key := range data {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		value := data[key]
		if err, ok := value.(error); ok {
			value = err.Error()
		}
		text := fmt.Sprint(value)
		if strings.ContainsAny(text, " \t\n\"=") {
			text = fmt.Sprintf("%q", text)
		}
		fmt.Fprintf(b, " %s=%s", key, text)
	}
}

// RedirectStandardLog sends the output of the standard log package, which third-party libraries
// and net/http use, through logrus at the INFO level, so it gets the same line format.
func RedirectStandardLog() {
	stdlog.SetFlags(0)
	stdlog.SetOutput(log.StandardLogger().WriterLevel(log.InfoLevel))
}
