import type { OperationGroup } from '@test-data/props'
import { REST_API_TYPE } from '@shared/entities'
import { GET_PET_BY_TAG_V1 } from '../operations'

export const genGroupsForEscaping = ({ pkg, version }: {
  pkg: { packageId: string }
  version: string
}): OperationGroup[] => {

  const chars = '!@#$%^&*()-+=/[]{}|,.:;\'"`?\\'
  const groups: OperationGroup[] = []

  for (const char of chars) {
    groups.push({
      groupName: `G${char}1`,
      apiType: REST_API_TYPE,
      packageId: pkg.packageId,
      version: version,
      testMeta: {
        toAdd: [
          {
            operations: [GET_PET_BY_TAG_V1],
          },
        ],
      },
    })
  }
  return groups
}
