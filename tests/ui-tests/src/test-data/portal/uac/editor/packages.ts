import { Package } from '@test-data/props'
import { GRP_P_EDITOR_ROOT_N } from './groups'
import { TOKEN_EDITOR_PACKAGE } from './tokens'

export const PKG_P_EDITOR_N = new Package({
  name: 'Editor',
  alias: 'PEDITORN',
  parent: GRP_P_EDITOR_ROOT_N,
  restGroupingPrefix: '/api/{group}/',
  apiKeys: [TOKEN_EDITOR_PACKAGE],
}, { kindPrefix: true })
