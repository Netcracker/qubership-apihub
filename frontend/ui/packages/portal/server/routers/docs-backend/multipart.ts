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

import type { Request } from 'express'

export type MultipartPart = {
  name: string
  filename?: string
  contentType?: string
  data: Buffer
}

/** Minimal multipart/form-data parser for the mock server (no streaming, whole body in memory). */
export function parseMultipart(req: Request): MultipartPart[] {
  const contentType = req.headers['content-type'] ?? ''
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType)
  const boundary = boundaryMatch?.[1] ?? boundaryMatch?.[2]
  const body: Buffer | undefined = Buffer.isBuffer(req.body) ? req.body : undefined
  if (!boundary || !body) {
    return []
  }

  const delimiter = Buffer.from(`--${boundary}`)
  const parts: MultipartPart[] = []
  let position = body.indexOf(delimiter)
  while (position !== -1) {
    const start = position + delimiter.length
    if (body.slice(start, start + 2).toString() === '--') {
      break
    }
    const next = body.indexOf(delimiter, start)
    if (next === -1) {
      break
    }
    // part = CRLF headers CRLF CRLF data CRLF
    const part = body.slice(start + 2, next - 2)
    const headersEnd = part.indexOf('\r\n\r\n')
    const headers = part.slice(0, headersEnd).toString()
    const data = part.slice(headersEnd + 4)
    const name = /name="([^"]*)"/.exec(headers)?.[1] ?? ''
    const filename = /filename="([^"]*)"/.exec(headers)?.[1]
    const partContentType = /content-type:\s*([^\r\n]+)/i.exec(headers)?.[1]
    parts.push({ name: name, filename: filename, contentType: partContentType, data: data })
    position = next
  }
  return parts
}
