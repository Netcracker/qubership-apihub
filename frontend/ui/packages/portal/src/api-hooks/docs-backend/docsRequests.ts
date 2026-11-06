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

import type { RequestJsonExtraOptions } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { API_V1, requestBlob, requestJson, requestVoid } from '@netcracker/qubership-apihub-ui-shared/utils/requests'
import { useGetDocsBackendPrefix } from '@netcracker/qubership-apihub-ui-shared/features/system-extensions/useSystemExtensions'

export const DOCS_ARTICLES_QUERY_KEY = 'docs-articles-query-key'
export const DOCS_ARTICLE_QUERY_KEY = 'docs-article-query-key'
export const DOCS_ADMIN_ARTICLES_QUERY_KEY = 'docs-admin-articles-query-key'
export const DOCS_ARTICLE_FILES_QUERY_KEY = 'docs-article-files-query-key'
export const DOCS_APIHUB_VERSIONS_QUERY_KEY = 'docs-apihub-versions-query-key'
export const DOCS_APIHUB_DOCUMENTS_QUERY_KEY = 'docs-apihub-documents-query-key'
export const DOCS_NAVIGATION_QUERY_KEY = 'docs-navigation-query-key'
export const DOCS_ADMIN_NAVIGATION_QUERY_KEY = 'docs-admin-navigation-query-key'
export const DOCS_HOME_ARTICLES_QUERY_KEY = 'docs-home-articles-query-key'
export const DOCS_ADMIN_HOME_ARTICLES_QUERY_KEY = 'docs-admin-home-articles-query-key'

/** Base path of the docs backend API as seen from the UI origin, e.g. "/docs-backend/api/v1". */
export function useDocsBackendBasePath(): string {
  const prefix = useGetDocsBackendPrefix()
  return `${prefix}${API_V1}`
}

/** URL of a file attached to an article (path relative to the article), usable as an image/link URL. */
export function useDocsArticleFileUrl(): (slug: string, path: string) => string {
  const basePath = useDocsBackendBasePath()
  return (slug: string, path: string) => `${basePath}/articles/${encodeURIComponent(slug)}/files/${path.split('/').map(encodeURIComponent).join('/')}`
}

export async function docsRequestJson<T extends object | null>(
  basePath: string,
  input: string,
  init?: RequestInit,
  options: Omit<RequestJsonExtraOptions, 'basePath'> = {},
): Promise<T> {
  // Public read endpoints answer 401 for anonymous callers when anonymous access is off;
  // that must not trigger the login redirect. Callers decide how to treat the error.
  return requestJson<T>(input, init, { basePath: basePath, skipAuthHandling: true, ...options })
}

export async function docsRequestVoid(basePath: string, input: string, init?: RequestInit): Promise<void> {
  return requestVoid(input, init, { basePath })
}

export async function docsRequestBlob(basePath: string, input: string, init?: RequestInit): Promise<Response> {
  return requestBlob(input, init, { basePath })
}
