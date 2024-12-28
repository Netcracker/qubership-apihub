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

import { buildUnknownDocument, dumpUnknownDocument } from './unknown.document'
import { UNKNOWN_API_TYPE } from './unknown.consts'
import { parseUnknownFile } from './unknown.parser'
import { ApiBuilder } from '../../types'
import { DOCUMENT_TYPE } from '../../consts'

export * from './unknown.consts'
export { buildBinaryDocument } from './unknown.document'

export const unknownApiBuilder: ApiBuilder<string> = {
  apiType: UNKNOWN_API_TYPE,
  types: [DOCUMENT_TYPE.JSON, DOCUMENT_TYPE.YAML, DOCUMENT_TYPE.UNKNOWN],
  parser: parseUnknownFile,
  buildDocument: buildUnknownDocument,
  dumpDocument: dumpUnknownDocument,
}
