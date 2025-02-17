import { Package } from '@test-data/props'
import { GRP_P_VIEWER_ROOT_R } from './groups'
import { TOKEN_VIEWER_PACKAGE } from './tokens'

export const PKG_P_VIEWER_R = new Package({
  name: 'Viewer',
  alias: 'PVIEWER',
  parent: GRP_P_VIEWER_ROOT_R,
  restGroupingPrefix: '/api/{group}/',
  apiKeys: [TOKEN_VIEWER_PACKAGE],
}, { kindPrefix: true })
