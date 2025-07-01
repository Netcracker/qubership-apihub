import { stringifyCyclicJso } from '@netcracker/qubership-apihub-api-unifier'
import { Diff, isDiffAdd, isDiffRemove, isDiffRename, isDiffReplace } from '@netcracker/qubership-apihub-api-diff'
import { isEmpty } from 'lodash'

export const stringifyDiffs = (diffs: Diff[]): string => {
  return stringifyCyclicJso(
    diffs.map(diff => {
      if (isDiffAdd(diff)) {
        const {
          afterDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(afterDeclarationPaths) ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      if (isDiffRemove(diff)) {
        const {
          beforeDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(beforeDeclarationPaths) ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      if (isDiffReplace(diff) || isDiffRename(diff)) {
        const {
          beforeDeclarationPaths = [],
          afterDeclarationPaths = [],
          ...rest
        } = diff

        return {
          ...rest,
          ...(!isEmpty(beforeDeclarationPaths) ? { beforeDeclarationPaths: `[${beforeDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
          ...(!isEmpty(afterDeclarationPaths) ? { afterDeclarationPaths: `[${afterDeclarationPaths.map(path => `[${path.join()}]`).join()}]` } : {}),
        }
      }
      return null
    }),
  )
}


