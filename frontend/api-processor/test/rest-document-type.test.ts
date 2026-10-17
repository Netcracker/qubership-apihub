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
import { REST_DOCUMENT_TYPE } from '../src/apitypes/rest/rest.consts'

/*
 * A case named `(gap)` records what happens today and is not what the design wants: the parser recognized the
 * file, and the type is lost anyway.
 */

const { UNKNOWN } = DOCUMENT_TYPE

const OPENAPI_JSON = '{"openapi": "3.0.0", "info": {"title": "t", "version": "1"}, "paths": {}}'
const OPENAPI_YAML = 'openapi: 3.0.0\ninfo:\n  title: t\n  version: "1"\npaths: {}\n'

const REST_ROWS: DocumentTypeCase[] = [
  { name: 'OpenAPI in JSON', fileId: 'spec.json', content: OPENAPI_JSON, type: REST_DOCUMENT_TYPE.OAS3, errored: false },
  { name: 'OpenAPI in YAML', fileId: 'spec.yaml', content: OPENAPI_YAML, type: REST_DOCUMENT_TYPE.OAS3, errored: false },
  { name: 'OpenAPI in a .yml file', fileId: 'spec.yml', content: OPENAPI_YAML, type: REST_DOCUMENT_TYPE.OAS3, errored: false },
  {
    name: 'OpenAPI 3.1',
    fileId: 'spec.json',
    content: OPENAPI_JSON.replace('3.0.0', '3.1.0'),
    type: REST_DOCUMENT_TYPE.OAS31,
    errored: false,
  },
  {
    name: 'Swagger 2.0',
    fileId: 'spec.json',
    content: '{"swagger": "2.0", "info": {"title": "t", "version": "1"}, "paths": {}}',
    type: REST_DOCUMENT_TYPE.SWAGGER,
    errored: false,
  },
  // the metaschema complaints are warnings, and the document is built
  {
    name: 'OpenAPI without the required info',
    fileId: 'spec.json',
    content: '{"openapi": "3.0.0", "paths": {}}',
    type: REST_DOCUMENT_TYPE.OAS3,
    errored: false,
  },

  // gap: the version key is there and the file does not parse
  {
    name: 'OpenAPI JSON cut short (gap)',
    fileId: 'spec.json',
    content: '{"openapi": "3.0.0", "info": {',
    type: UNKNOWN,
    errored: true,
  },
  {
    name: 'OpenAPI YAML that does not parse (gap)',
    fileId: 'spec.yaml',
    content: 'openapi: 3.0.0\ninfo:\n  title: "unclosed\n',
    type: UNKNOWN,
    errored: true,
  },

  { name: 'JSON without a version key', fileId: 'spec.json', content: '{"title": "t"}', type: UNKNOWN, errored: false },
  { name: 'JSON without a version key, cut short', fileId: 'spec.json', content: '{"title": ', type: UNKNOWN, errored: true },
  // nothing to recognize; the empty text is no JSON, and it is YAML
  { name: 'an empty .json file', fileId: 'spec.json', content: '', type: UNKNOWN, errored: true },
  { name: 'an empty .yaml file', fileId: 'spec.yaml', content: '', type: UNKNOWN, errored: false },
]

describe('The document type of a REST file', () => {
  test.each(REST_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('rest', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
