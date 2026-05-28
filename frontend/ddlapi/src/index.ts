// Public API — re-exports everything from this package.
// Consumers must import from this module only; internal module paths are unstable.

export * from './constants'
export * from './attrs'
export * from './exprs'
export * from './types'
export * from './schema'
export * from './factories'
export * from './utils'

// Parser public surface
export { type SourceRange } from './parser/positions'
export {
  buildFromDdl,
  DdlParseError,
  DdlBuildError,
  type DdlNonFatalError,
  type BuildFromDdlOptions,
} from './parser/buildFromDdl'
