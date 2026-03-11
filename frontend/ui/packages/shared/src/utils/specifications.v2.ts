import {
  getLocationForJsonPath as jsonGetLocationForJsonPath,
  parseWithPointers as jsonParseWithPointers,
} from '@stoplight/json'
import type { ILocation } from '@stoplight/types'
import {
  getLocationForJsonPath as yamlGetLocationForJsonPath,
  parseWithPointers as yamlParseWithPointers,
} from '@stoplight/yaml'
import type { SpecItemPath } from './specifications'
import { decodeKey } from './specifications'

const Formats = {
  json: 'json',
  yaml: 'yaml',
} as const
type Format = typeof Formats[keyof typeof Formats]

type ParsedContent<F extends Format> =
  F extends typeof Formats.json ? ReturnType<typeof jsonParseWithPointers> :
  F extends typeof Formats.yaml ? ReturnType<typeof yamlParseWithPointers> :
  never

export function parseWithPointers(
  content: string,
  format: Format,
): ParsedContent<typeof format> {
  switch (format) {
    case Formats.json:
      return jsonParseWithPointers(content)
    case Formats.yaml:
      return yamlParseWithPointers(content)
  }
}

function isParsedJsonContent(format: Format, content: ParsedContent<Format>): content is ReturnType<typeof jsonParseWithPointers> {
  return format === Formats.json
}

function isParsedYamlContent(format: Format, content: ParsedContent<Format>): content is ReturnType<typeof yamlParseWithPointers> {
  return format === Formats.yaml
}

export function findLocationByPath(
  content: ParsedContent<typeof format>,
  path: SpecItemPath,
  format: Format,
): ILocation | undefined {
  if (!path.length) {
    return undefined
  }

  if (isParsedJsonContent(format, content)) {
    return jsonGetLocationForJsonPath(content, path.map(decodeKey))
  }
  if (isParsedYamlContent(format, content)) {
    return yamlGetLocationForJsonPath(content, path.map(decodeKey))
  }

  return undefined
}
