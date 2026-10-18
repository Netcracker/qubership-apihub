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
import { dump } from '../src/utils/export'
import { FILE_FORMAT_JSON, FILE_FORMAT_YAML } from '../src'
import { parse } from 'yaml'

// Real-world description from a REST API spec that contains a markdown table
// with tab characters (\t) inside cells — exactly the case that caused js-yaml
// to choose double-quoted scalar style and escape \n as literal \n in YAML output.
const MARKDOWN_TABLE =
  'The following attributes are available for filtering:\n' +
  '| Name                  | Options               | Description | \n' +
  '|------                 |---------              |-------------|\n' +
  '| id                    | eq, ne                |\tThe id of Product Offering Category.|\n' +
  '| name                  | eq, ne, c             |\tName of the Product Offering Category.|\n' +
  '| code                  | eq, ne, c             | Code of the Product Offering Category.|\n' +
  '| parent.id             | eq, ne                | parent.id of Product Offering Category |\n' +
  '| parent.name           | eq, ne, c             | parent.code of Product Offering Category |\n' +
  '| parent.code           | eq, ne, c             | parent.name of Product Offering Category |\n' +
  '| parent.parent.name    | eq, ne, c             | parent.parent.name of Product Offering Category |\n' +
  '| parent.parent.code    | eq, ne, c             | parent.parent.code of Product Offering Category |      \n' +
  '| categoryParameters.{name}| eq, ne, c             | Filtering by extended parameter values of Product Offering Category. Instead of {name} the real name of extended parameter should be passed. |\n' +
  '| categoryParameters.values.paramTags.[filter parameter]| eq, ne, c| Filtering is done only for params.values sub-resources. Offering Categories themselves will be returned despite this filter. |\n' +
  '\n' +
  '> Note: Filtration parameters are query parameters. Example below given in map representation should be translated into query syntax.\n'

const SPEC_WITH_TABLE_DESCRIPTION = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1.0.0' },
  paths: {
    '/products': {
      get: {
        operationId: 'getProducts',
        parameters: [
          {
            name: 'filtering',
            in: 'query',
            description: MARKDOWN_TABLE,
            schema: { type: 'string' },
          },
        ],
        responses: { '200': { description: 'Success' } },
      },
    },
  },
}

describe('dump: markdown table in description', () => {
  test('YAML format: table rows must not be wrapped or folded', async () => {
    const [[yamlString]] = dump(SPEC_WITH_TABLE_DESCRIPTION, FILE_FORMAT_YAML)

    // Must use literal block scalar (|), not folded (>)
    expect(yamlString).not.toMatch(/description: >/)
    expect(yamlString).toMatch(/description: \|/)

    // Each table row must be on its own unbroken line
    const lines = yamlString.split('\n')
    const tableRows = lines.filter(line => line.trimStart().startsWith('|'))
    expect(tableRows.length).toBe(12) // 1 header + 1 separator + 10 data rows

    // No table row should be broken mid-line (each must start and end with |)
    for (const row of tableRows) {
      expect(row.trim()).toMatch(/^\|.*\|$/)
    }

    // Parsed back YAML must preserve the original description exactly
    const parsed = parse(yamlString) as typeof SPEC_WITH_TABLE_DESCRIPTION
    const description = parsed.paths['/products'].get.parameters[0].description
    expect(description).toBe(MARKDOWN_TABLE)
  })

  test('JSON format: description must be valid JSON with \\n escape sequences', async () => {
    const [[jsonString]] = dump(SPEC_WITH_TABLE_DESCRIPTION, FILE_FORMAT_JSON)

    // Must be valid JSON
    const parsed = JSON.parse(jsonString) as typeof SPEC_WITH_TABLE_DESCRIPTION
    const description = parsed.paths['/products'].get.parameters[0].description

    // After parsing, description must match the original string (with actual newlines)
    expect(description).toBe(MARKDOWN_TABLE)

    // Each table row must be present as a complete line in the parsed description
    const lines = description.split('\n')
    const tableRows = lines.filter((line: string) => line.trimStart().startsWith('|'))
    expect(tableRows.length).toBe(12)

    for (const row of tableRows) {
      expect(row.trim()).toMatch(/^\|.*\|$/)
    }
  })
})
