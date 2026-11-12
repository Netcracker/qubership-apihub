import { Diff } from '@netcracker/qubership-apihub-api-diff'
import { calculateHash } from './hashes'
import { FillKeys } from './objects'
import { declarationPathsIdentifier } from './path'
import { ChangeMessage } from '../types'
import { AFTER_VALUE_NORMALIZED_PROPERTY, BEFORE_VALUE_NORMALIZED_PROPERTY } from '../consts'

export function calculateDiffId(diff: Diff): string {
  // `Diff` is a discriminated union and these fields exist on some members only.
  // `FillKeys` gives every member the keys it lacks, as optional and `undefined`, so they can
  // be read below without narrowing first.
  const {
    scope,
    action,
    beforeDeclarationPaths: previousDeclarationJsonPaths = [],
    afterDeclarationPaths: currentDeclarationJsonPaths = [],
    beforeKey: previousKey = undefined,
    afterKey: currentKey = undefined,
    type: severity,
  }: FillKeys<Diff> = { ...diff }

  const beforeValueNormalized = (diff as Record<symbol, unknown>)[BEFORE_VALUE_NORMALIZED_PROPERTY]
  const afterValueNormalized = (diff as Record<symbol, unknown>)[AFTER_VALUE_NORMALIZED_PROPERTY]

  return calculateChangeId({
    scope,
    action,
    previousDeclarationJsonPaths,
    currentDeclarationJsonPaths,
    // This calculateDiffId is used when deduplicating differences from different documents, therefore,
    // caching the hash by instances will not work here, so we simply calculate the hash without using the cache.
    previousValueHash: calculateHash(beforeValueNormalized),
    currentValueHash: calculateHash(afterValueNormalized),
    previousKey,
    currentKey,
    severity,
  })
}

export function calculateChangeId(change: ChangeMessage): string {
  // `ChangeMessage` is a discriminated union; see the note above.
  const {
    scope,
    previousDeclarationJsonPaths = [],
    currentDeclarationJsonPaths = [],
    previousValueHash = '',
    currentValueHash = '',
    previousKey = '',
    currentKey = '',
    severity,
  }: FillKeys<ChangeMessage> = { ...change }

  const previousPaths = declarationPathsIdentifier(previousDeclarationJsonPaths)
  const currentPaths = declarationPathsIdentifier(currentDeclarationJsonPaths)

  return `${previousPaths}-${currentPaths}-${previousValueHash}-${currentValueHash}-${scope}-${previousKey}-${currentKey}-${severity}`
}
