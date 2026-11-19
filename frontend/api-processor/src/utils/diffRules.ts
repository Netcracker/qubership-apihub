import { ActionType, DiffAction } from '@netcracker/qubership-apihub-api-diff'
import { ANY_PATH_SEGMENT } from './path'
import { PathPredicate, PREDICATE_ANY_VALUE } from '@netcracker/qubership-apihub-api-unifier'

export type DiffRule = {
  pathTemplate: PathPredicate[]
  allowedActions: ActionType[]
}

export const EXTERNAL_DOCS_DIFF_RULES: DiffRule[] = [
  {
    pathTemplate: [['externalDocs']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['externalDocs', ANY_PATH_SEGMENT]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
]

export const DIFF_RULES: DiffRule[] = [
  // had to ignore info because can't exclude from spec due to usage in "Unable to merge" message
  {
    pathTemplate: [['info']],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['info', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['info', PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove, DiffAction.replace],
  },
  {
    pathTemplate: [['servers']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['servers', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['security']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['security', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['components', PREDICATE_ANY_VALUE, PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['paths']],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  {
    pathTemplate: [['paths', PREDICATE_ANY_VALUE]],
    allowedActions: [DiffAction.add, DiffAction.remove],
  },
  ...EXTERNAL_DOCS_DIFF_RULES,
]
