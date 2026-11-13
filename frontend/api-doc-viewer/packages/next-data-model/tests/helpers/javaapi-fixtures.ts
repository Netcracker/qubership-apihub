import fs from 'fs'
import path from 'path'

export function loadJavaApiSample(name: 'api-report' | 'api-diff'): unknown {
  return JSON.parse(fs.readFileSync(path.join(__dirname, '../../../samples/javaapi', `${name}.json`), 'utf8'))
}

export function javaApiElement(className: string, overrides: Partial<{
  elementType: string
  member: string
  status: string
  changeTypes: string[]
  details: string
  binaryCompatible: boolean
  sourceCompatible: boolean
  breaking: boolean
  semver: string
}> = {}) {
  return {
    className,
    elementType: 'CLASS',
    status: 'UNCHANGED',
    changeTypes: [],
    binaryCompatible: true,
    sourceCompatible: true,
    breaking: false,
    semver: 'NONE',
    ...overrides,
  }
}

export function javaApiDocument(...changes: unknown[]) {
  return { artifacts: [{ changes }] }
}
