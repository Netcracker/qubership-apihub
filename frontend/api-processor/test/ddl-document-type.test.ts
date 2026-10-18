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
import { DDL_DOCUMENT_TYPE } from '../src/apitypes/ddl/ddl.consts'

/*
 * A case named `(gap)` records what happens today and is not what the design wants: the parser recognized the
 * file, and the type is lost anyway.
 */

const { UNKNOWN } = DOCUMENT_TYPE

const TABLE = 'CREATE TABLE users (id integer PRIMARY KEY);\n'

const DDL_ROWS: DocumentTypeCase[] = [
  { name: 'a table definition', fileId: 'spec.sql', content: TABLE, type: DDL_DOCUMENT_TYPE.DDL, errored: false },
  // gap: the extension alone claims the file, and the SQL does not parse
  { name: 'SQL that does not parse (gap)', fileId: 'spec.sql', content: 'CREATE TABLE users (', type: UNKNOWN, errored: true },
  // the extension alone claims the file, and no statement is no error
  { name: 'an empty .sql file', fileId: 'spec.sql', content: '', type: DDL_DOCUMENT_TYPE.DDL, errored: false },
]

describe('The document type of a DDL file', () => {
  test.each(DDL_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('ddl', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
