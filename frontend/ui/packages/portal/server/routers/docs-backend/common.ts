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
import type { Response } from 'express'
import type { MockArticle } from '../../mocks/docs-backend/articles'

export type Principal = 'anonymous' | 'user' | 'admin' | 'denied'

/**
 * Principal emulation:
 *  - MOCK_ANONYMOUS=true            -> anonymous principal (only public content, admin endpoints -> 401)
 *  - MOCK_ANONYMOUS_ACCESS=false    -> anonymous access disabled (anonymous -> 401 everywhere)
 *  - MOCK_DOCS_ROLE=user            -> authenticated non-admin
 *  - otherwise                      -> system administrator
 */
export function getPrincipal(): Principal {
  if (process.env.MOCK_ANONYMOUS === 'true') {
    return process.env.MOCK_ANONYMOUS_ACCESS === 'false' ? 'denied' : 'anonymous'
  }
  return process.env.MOCK_DOCS_ROLE === 'user' ? 'user' : 'admin'
}

export function isVisible(article: MockArticle, principal: Principal): boolean {
  if (article.scope === 'package') {
    return true
  }
  return article.visibility === 'public' || principal !== 'anonymous'
}

export function sendError(res: Response, status: number, code: string, message: string): void {
  res.status(status).json({ status, code, message })
}
