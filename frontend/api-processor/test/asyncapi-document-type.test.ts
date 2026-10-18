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

import { describe, expect, test } from '@jest/globals'
import { DocumentTypeCase, publishDocumentTypeCase } from './helpers'
import { DOCUMENT_TYPE } from '../src/consts'
import { ASYNC_DOCUMENT_TYPE } from '../src/apitypes/async/async.consts'

const { UNKNOWN } = DOCUMENT_TYPE

const ASYNCAPI_YAML = 'asyncapi: 3.0.0\ninfo:\n  title: t\n  version: 1.0.0\n'

const ASYNC_ROWS: DocumentTypeCase[] = [
  { name: 'AsyncAPI in YAML', fileId: 'spec.yaml', content: ASYNCAPI_YAML, type: ASYNC_DOCUMENT_TYPE.AAS3, errored: false },
  {
    name: 'AsyncAPI in JSON',
    fileId: 'spec.json',
    content: '{"asyncapi": "3.0.0", "info": {"title": "t", "version": "1.0.0"}}',
    type: ASYNC_DOCUMENT_TYPE.AAS3,
    errored: false,
  },
  {
    name: 'AsyncAPI YAML that does not parse',
    fileId: 'spec.yaml',
    content: 'asyncapi: 3.0.0\ninfo:\n  title: "unclosed\n',
    type: ASYNC_DOCUMENT_TYPE.AAS3,
    errored: true,
  },
  {
    name: 'AsyncAPI JSON cut short',
    fileId: 'spec.json',
    content: '{"asyncapi": "3.0.0", "info": {',
    type: ASYNC_DOCUMENT_TYPE.AAS3,
    errored: true,
  },
  {
    name: 'AsyncAPI without the required info',
    fileId: 'spec.yaml',
    content: 'asyncapi: 3.0.0\nchannels: {}\n',
    type: ASYNC_DOCUMENT_TYPE.AAS3,
    errored: true,
  },
  {
    name: 'AsyncAPI 2, which the parser does not read',
    fileId: 'spec.yaml',
    content: 'asyncapi: 2.6.0\ninfo:\n  title: t\n  version: 1.0.0\nchannels: {}\n',
    type: UNKNOWN,
    errored: false,
  },
]

describe('The document type of an AsyncAPI file', () => {
  test.each(ASYNC_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('asyncapi', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
