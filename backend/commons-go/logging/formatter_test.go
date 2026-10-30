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

package logging

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	log "github.com/sirupsen/logrus"
)

var testTime = time.Date(2026, 10, 28, 14, 3, 12, 345_000_000, time.FixedZone("UTC+3", 3*60*60))

func format(t *testing.T, entry *log.Entry) string {
	t.Helper()
	out, err := NewFormatter().Format(entry)
	if err != nil {
		t.Fatalf("Format returned an error: %v", err)
	}
	return string(out)
}

func TestFormatWritesUTCLineWithEmptyRequestID(t *testing.T) {
	entry := &log.Entry{Time: testTime, Level: log.InfoLevel, Message: "Package version published"}

	got := format(t, entry)

	want := "[2026-10-28T11:03:12.345] [INFO] [request_id=] [tenant_id=] [thread_id=] [class=] Package version published\n"
	if got != want {
		t.Errorf("got  %q\nwant %q", got, want)
	}
}

func TestFormatTakesRequestIDFromContext(t *testing.T) {
	ctx := ContextWithRequestID(context.Background(), "abc-123")
	entry := &log.Entry{Time: testTime, Level: log.WarnLevel, Message: "slow query", Context: ctx}

	got := format(t, entry)

	want := "[2026-10-28T11:03:12.345] [WARN] [request_id=abc-123] [tenant_id=] [thread_id=] [class=] slow query\n"
	if got != want {
		t.Errorf("got  %q\nwant %q", got, want)
	}
}

func TestFormatAppendsSortedFields(t *testing.T) {
	entry := &log.Entry{
		Time:    testTime,
		Level:   log.ErrorLevel,
		Message: "build failed",
		Data:    log.Fields{"error": errors.New("no such file"), "buildId": "b1"},
	}

	got := format(t, entry)

	want := "[2026-10-28T11:03:12.345] [ERROR] [request_id=] [tenant_id=] [thread_id=] [class=] build failed" +
		" buildId=b1 error=\"no such file\"\n"
	if got != want {
		t.Errorf("got  %q\nwant %q", got, want)
	}
}

func TestFormatKeepsMultilineMessage(t *testing.T) {
	entry := &log.Entry{Time: testTime, Level: log.DebugLevel, Message: "first\nsecond\n"}

	got := format(t, entry)

	want := "[2026-10-28T11:03:12.345] [DEBUG] [request_id=] [tenant_id=] [thread_id=] [class=] first\nsecond\n"
	if got != want {
		t.Errorf("got  %q\nwant %q", got, want)
	}
}

func TestRequestIDMiddlewarePutsHeaderIntoContext(t *testing.T) {
	var got string
	handler := RequestIDMiddleware(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		got = RequestIDFromContext(r.Context())
	}))
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("x-request-id", "req-42")

	handler.ServeHTTP(httptest.NewRecorder(), req)

	if got != "req-42" {
		t.Errorf("got request ID %q, want %q", got, "req-42")
	}
}
