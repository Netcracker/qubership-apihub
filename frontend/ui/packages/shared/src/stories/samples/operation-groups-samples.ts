import type { OperationGroup } from '../../entities/operation-groups'

export const operationGroups: OperationGroup[] = [
  {
    groupName: 'Group1',
    isPrefixGroup: true,
    description: 'Group contains operations that are used in x-x integration',
    operationsCount: 7,
  },
  {
    groupName: 'Group2',
    isPrefixGroup: false,
    description: 'Manual Group contains operations that user adds self',
    operationsCount: 13,
  },
  {
    groupName: 'Group3',
    isPrefixGroup: false,
    description: 'GraphQL Manual Group',
    operationsCount: 45,
  },
  {
    groupName: 'Group4',
    isPrefixGroup: true,
    description: '',
    operationsCount: 200,
  },
  {
    groupName: 'Group4',
    isPrefixGroup: false,
    description: 'Empty group',
    operationsCount: 2,
  },
]
