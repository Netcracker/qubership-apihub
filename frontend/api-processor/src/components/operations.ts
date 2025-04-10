/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { ApiOperation, BuilderContext, VersionDocument } from '../types'
import { DebugPerformanceContext } from '../utils/logs'

export const buildOperations = async (document: VersionDocument, ctx: BuilderContext, debugCtx?: DebugPerformanceContext): Promise<ApiOperation[]> => {
  const builder = ctx.apiBuilders.find(({ types }) => types.includes(document.type))

  if (builder) {
    try {
      return await builder.buildOperations?.(document, ctx, debugCtx) ?? []
    } catch (error) {
      throw new Error(`Cannot process the "${document.fileId}" document. ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return []
}
