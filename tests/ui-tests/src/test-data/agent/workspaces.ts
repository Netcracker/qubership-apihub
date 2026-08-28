import { ALIAS_PREFIX, TEST_PREFIX } from '@test-data'
import { Workspace } from '@test-data/props'

const DEFAULT_WORKSPACE_NAME = process.env.TEST_DEFAULT_WORKSPACE_NAME || 'Qubership'
const DEFAULT_WORKSPACE_ALIAS = process.env.TEST_DEFAULT_WORKSPACE_ALIAS || 'QS'

export const A_WS_DEFAULT = new Workspace({
  name: DEFAULT_WORKSPACE_NAME,
  alias: DEFAULT_WORKSPACE_ALIAS,
})
export const A_WS_R = new Workspace({
  name: `${TEST_PREFIX}Agent-${process.env.TEST_ID_R}`,
  alias: `${ALIAS_PREFIX}A-${process.env.TEST_ID_R}`,
  description: 'ATUI Agent reusable test workspace',
})
export const A_WS_N = new Workspace({
  name: `${TEST_PREFIX}Agent-empty-${process.env.TEST_ID_N}`,
  alias: `${ALIAS_PREFIX}A-${process.env.TEST_ID_N}`,
  description: 'ATUI Agent non-reusable test workspace',
})
