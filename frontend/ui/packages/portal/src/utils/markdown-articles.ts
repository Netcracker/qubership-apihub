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

const SLUG_MAX_LENGTH = 128

/** URL-safe slug matching the docs backend pattern ^[a-z0-9][a-z0-9-]{0,127}$ */
export function toArticleSlug(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '')
  return slug
}

export type MarkdownArticleHeader = Readonly<{
  title: string
  subtitle: string
}>

/**
 * Title = first level-1 heading (or the file name without extension), subtitle = first paragraph after it.
 */
export function parseMarkdownArticle(markdown: string, fileName: string): MarkdownArticleHeader {
  const lines = markdown.split(/\r?\n/)
  const headingIndex = lines.findIndex(line => /^#\s+\S/.test(line))
  const title = headingIndex >= 0
    ? lines[headingIndex].replace(/^#\s+/, '').trim()
    : fileName.replace(/\.(md|markdown)$/i, '').replace(/[-_]+/g, ' ').trim()

  let subtitle = ''
  for (const line of lines.slice(headingIndex + 1)) {
    const text = line.trim()
    if (!text) {
      if (subtitle) {
        break
      }
      continue
    }
    if (/^(#|[-*]\s|\d+\.\s|```|\||>|!\[)/.test(text)) {
      break
    }
    subtitle = subtitle ? `${subtitle} ${text}` : text
  }
  return { title: title, subtitle: subtitle.replace(/[*_`]/g, '') }
}
