import { Dashboard } from '@test-data/props'
import { GRP_P_EDITOR_ROOT_N } from './groups'
import { TOKEN_EDITOR_DASHBOARD } from './tokens'

export const DSH_P_EDITOR_N = new Dashboard({
  name: 'Editor',
  alias: 'DEDITORN',
  parent: GRP_P_EDITOR_ROOT_N,
  apiKeys: [TOKEN_EDITOR_DASHBOARD],
}, { kindPrefix: true })
