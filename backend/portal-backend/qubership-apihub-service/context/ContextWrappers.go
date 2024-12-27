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

package context

import "context"

const stacktraceKey = "stacktrace"
const securityKey = "security"

func CreateContextWithStacktrace(ctx context.Context, functionWithParameters string) context.Context {
	var result context.Context
	val := ctx.Value(stacktraceKey)
	arr, ok := val.([]string)
	if !ok {
		result = context.WithValue(ctx, stacktraceKey, []string{functionWithParameters})
	} else {
		result = context.WithValue(ctx, stacktraceKey, append(arr, functionWithParameters))
	}
	return result
}

func GetStacktraceFromContext(ctx context.Context) []string {
	val := ctx.Value(stacktraceKey)
	arr, ok := val.([]string)
	if !ok {
		return nil
	} else {
		return arr
	}
}

func CreateContextWithSecurity(ctx context.Context, secCtx SecurityContext) context.Context {
	return context.WithValue(ctx, securityKey, secCtx)
}

func GetSecurityContext(ctx context.Context) *SecurityContext {
	val := ctx.Value(securityKey)
	secCtx, ok := val.(SecurityContext)
	if !ok {
		return nil
	} else {
		return &secCtx
	}
}
