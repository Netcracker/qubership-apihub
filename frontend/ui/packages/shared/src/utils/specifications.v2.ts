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

export function findLocationByPath(
  content: string,
  path: SpecItemPath,
  format: 'json' | 'yaml',
): ILocation | undefined {
  switch (format) {
    case 'json':
      return jsonFindLocationByPath(content, path)
    case 'yaml':
      return yamlFindLocationByPath(content, path)
  }
  return undefined
}

function jsonFindLocationByPath(
  content: string,
  path: SpecItemPath,
): ILocation | undefined {
  if (!path.length) {
    return undefined
  }

  return jsonGetLocationForJsonPath(
    jsonParseWithPointers(content),
    path.map(decodeKey),
  )
}


function yamlFindLocationByPath(
  content: string,
  path: SpecItemPath,
): ILocation | undefined {
  if (!path.length) {
    return undefined
  }

  return yamlGetLocationForJsonPath(
    yamlParseWithPointers(content),
    path.map(decodeKey),
  )
}
