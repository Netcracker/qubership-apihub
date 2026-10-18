import { ALIAS_PREFIX } from '@test-data'
import { Workspace } from '@test-data/props'

export const WSP_P_UAC_GENERAL_N = new Workspace({
  name: 'Portal-UAC-General',
  alias: `${ALIAS_PREFIX}P9-${process.env.TEST_ID_N}`,
  description: 'For part of UAC General scope',
}, { testPrefix: true, testId: 'non-reusable' })
