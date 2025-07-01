import { ALIAS_PREFIX } from '@test-data'
import { Workspace } from '@test-data/props'

export const P_WS_DSH_COMPARISON1_R = new Workspace({
  name: 'Portal-1',
  alias: `${ALIAS_PREFIX}P10-${process.env.TEST_ID_R}`,
  description: 'Reusable. Different Dashboards comparison',
}, { testPrefix: true, testId: 'reusable' })

export const P_WS_DSH_COMPARISON2_R = new Workspace({
  name: 'Portal-2',
  alias: `${ALIAS_PREFIX}P11-${process.env.TEST_ID_R}`,
  description: 'Reusable. Different Dashboards comparison',
}, { testPrefix: true, testId: 'reusable' })
