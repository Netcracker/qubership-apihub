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
import { buildSchema, introspectionFromSchema } from 'graphql/utilities'
import { DOCUMENT_TYPE } from '../src/consts'
import { GRAPHQL_DOCUMENT_TYPE } from '../src/apitypes/graphql/graphql.consts'
import { REST_DOCUMENT_TYPE } from '../src/apitypes/rest/rest.consts'

/*
 * A case named `(gap)` records what happens today and is not what the design wants: the parser recognized the
 * file, and the type is lost anyway.
 */

const { UNKNOWN } = DOCUMENT_TYPE

const SCHEMA = 'type Query {\n  user: User\n}\n\ntype User {\n  id: ID!\n}\n'
const INTROSPECTION = JSON.stringify(introspectionFromSchema(buildSchema(SCHEMA)))
const INTROSPECTION_START = '{"__schema": {"queryType": {"name": "Query"}, "types": ['
const OPENAPI_JSON = '{"openapi": "3.0.0", "info": {"title": "t", "version": "1"}, "paths": {}}'
const TABLE = 'CREATE TABLE users (id integer PRIMARY KEY);\n'

const GRAPHQL_ROWS: DocumentTypeCase[] = [
  // a schema, sound or not, keeps the GraphQL type
  { name: 'a schema', fileId: 'spec.graphql', content: SCHEMA, type: GRAPHQL_DOCUMENT_TYPE.SCHEMA, errored: false },
  { name: 'a schema in a .gql file', fileId: 'spec.gql', content: SCHEMA, type: GRAPHQL_DOCUMENT_TYPE.SCHEMA, errored: false },
  {
    name: 'a schema that opens with a comment and a description',
    fileId: 'spec.graphql',
    content: `# type of the file\n"""\ntype of thing\n"""\n${SCHEMA}`,
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  {
    name: 'a schema of one directive',
    fileId: 'spec.graphql',
    content: 'directive @internal on FIELD_DEFINITION\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  {
    name: 'a schema with a field defined twice',
    fileId: 'spec.graphql',
    content: 'type Query {\n  user: String\n  user: String\n}\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },
  {
    name: 'a schema with an unclosed type',
    fileId: 'spec.graphql',
    content: 'type Query {\n  user: String\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },
  {
    name: 'a schema block that names an undefined root type',
    fileId: 'spec.graphql',
    content: 'schema {\n  query: Missing\n}\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },
  // the only definition is a directive, and its location is not one GraphQL has
  {
    name: 'a directive with an unknown location',
    fileId: 'spec.graphql',
    content: 'directive @internal on NOWHERE\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },
  // the marker is looked for anywhere in the text, not only where a line starts
  {
    name: 'a definition that does not start its line',
    fileId: 'spec.graphql',
    content: '? type Query { user: String }\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },

  // a byte order mark is not part of the text
  {
    name: 'a schema behind a byte order mark',
    fileId: 'spec.graphql',
    content: `\uFEFF${SCHEMA}`,
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },

  // the other two forms a GraphQL API arrives in
  {
    name: 'an introspection result',
    fileId: 'spec.json',
    content: INTROSPECTION,
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  {
    name: 'a GraphAPI 0.x document',
    fileId: 'spec.json',
    content: '{"graphapi": "0.1.0", "queries": {}}',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  // gap: the parser matches only a `0.x` version, and 1.0.0 is the one the graphapi library writes
  {
    name: 'a GraphAPI 1.0.0 document (gap)',
    fileId: 'spec.json',
    content: '{"graphapi": "1.0.0", "queries": {}}',
    type: UNKNOWN,
    errored: false,
  },

  // the marker is a match on the text, so this is taken for a schema that does not parse
  {
    name: 'a description that defines nothing',
    fileId: 'spec.graphql',
    content: '"""\ntype Query\n"""\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: true,
  },
  // a file of queries builds into a schema that defines nothing, and nothing reports it
  {
    name: 'queries in a .graphql file',
    fileId: 'spec.graphql',
    content: 'query Users {\n  users {\n    id\n  }\n}\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  {
    name: 'queries that select fields named like keywords',
    fileId: 'spec.graphql',
    content: 'query Users { users { type name } }\n',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  // unless the queries do not build either: then the file is no schema, and nothing reports it
  {
    name: 'queries with an unclosed selection',
    fileId: 'spec.graphql',
    content: 'query Users {\n  users {\n    id\n',
    type: UNKNOWN,
    errored: false,
  },

  // an introspection or GraphAPI file that does not parse keeps the type its marker gave it
  {
    name: 'an introspection result cut short, in a .graphql file',
    fileId: 'spec.graphql',
    content: INTROSPECTION_START,
    type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
    errored: true,
  },
  {
    name: 'an introspection result cut short, in a .json file',
    fileId: 'spec.json',
    content: INTROSPECTION_START,
    type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
    errored: true,
  },
  {
    name: 'an introspection result in YAML that does not parse',
    fileId: 'spec.yaml',
    content: '__schema:\n  queryType: "unclosed\n',
    type: GRAPHQL_DOCUMENT_TYPE.INTROSPECTION,
    errored: true,
  },
  {
    name: 'a GraphAPI document cut short',
    fileId: 'spec.json',
    content: '{"graphapi": "0.1.0", "queries": {',
    type: GRAPHQL_DOCUMENT_TYPE.GRAPHAPI,
    errored: true,
  },

  // nothing checks an introspection result for completeness, so an empty one is an empty schema
  {
    name: 'an introspection result without types',
    fileId: 'spec.json',
    content: '{"__schema": {}}',
    type: GRAPHQL_DOCUMENT_TYPE.SCHEMA,
    errored: false,
  },
  // gap: the file parsed as introspection and its document could not be built
  {
    name: 'an introspection result with a type that has no fields (gap)',
    fileId: 'spec.json',
    content: '{"__schema": {"queryType": {"name": "Query"}, "types": [{"kind": "OBJECT", "name": "Query"}]}}',
    type: UNKNOWN,
    errored: true,
  },

  // a .graphql file that does not build and defines nothing of the type system is some other file
  {
    name: 'plain text in a .graphql file',
    fileId: 'spec.graphql',
    content: 'Release notes, not a schema.\n',
    type: UNKNOWN,
    errored: false,
  },
  {
    name: 'YAML with a type key in a .graphql file',
    fileId: 'spec.graphql',
    content: 'components:\n  schemas:\n    User:\n      type: object\n',
    type: UNKNOWN,
    errored: false,
  },
  { name: 'an empty .graphql file', fileId: 'spec.graphql', content: '', type: UNKNOWN, errored: false },
  { name: 'an empty .gql file', fileId: 'spec.gql', content: '', type: UNKNOWN, errored: false },
  {
    name: 'a fragment with fields named like keywords',
    fileId: 'spec.graphql',
    content: 'fragment Named on User {\n  interface\n  name\n}\n',
    type: UNKNOWN,
    errored: false,
  },
  { name: 'SQL in a .graphql file', fileId: 'spec.graphql', content: TABLE, type: UNKNOWN, errored: false },

  // the REST parser runs first and takes any text that opens with `{` and names an OpenAPI version
  {
    name: 'OpenAPI JSON in a .graphql file',
    fileId: 'spec.graphql',
    content: OPENAPI_JSON,
    type: REST_DOCUMENT_TYPE.OAS3,
    errored: false,
  },

  // a schema under an extension the GraphQL parser does not read
  { name: 'a schema in a .txt file', fileId: 'spec.txt', content: SCHEMA, type: UNKNOWN, errored: false },
  { name: 'a schema in a .json file', fileId: 'spec.json', content: SCHEMA, type: UNKNOWN, errored: true },
]

describe('The document type of a GraphQL file', () => {
  test.each(GRAPHQL_ROWS)('should publish $name as $type, errored: $errored', async (row) => {
    expect(await publishDocumentTypeCase('graphql', row)).toEqual({ type: row.type, errored: row.errored })
  }, 30000)
})
