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

/**
 * Font families for inline styles. The library's `@font-face` families are renamed to
 * `api-doc-viewer <family>` by the CSS isolation PostCSS plugin (`postcss/css-isolation.cjs`), so an
 * inline style must use the renamed family. Design: docs/design/shared/features/css-isolation.md
 */
export const FONT_FAMILY_INTER_NAME = 'api-doc-viewer Inter'

/** {@link FONT_FAMILY_INTER_NAME} quoted for a CSS `font-family` value. */
export const FONT_FAMILY_INTER = `"${FONT_FAMILY_INTER_NAME}"`
