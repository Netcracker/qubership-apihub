import { Dashboard } from '@test-data/props'
import { GRP_P_VIEWER_ROOT_R } from './groups'
import { TOKEN_VIEWER_DASHBOARD } from './tokens'

export const DSH_P_VIEWER_R = new Dashboard({
  name: 'Viewer',
  alias: 'DVIEWER',
  parent: GRP_P_VIEWER_ROOT_R,
  apiKeys: [TOKEN_VIEWER_DASHBOARD],
}, { kindPrefix: true })
