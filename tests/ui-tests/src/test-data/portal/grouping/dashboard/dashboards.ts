import { Dashboard } from '@test-data/props'
import { P_GRP_GROUPING_N, P_GRP_GROUPING_R } from '../groups'

export const P_DSH_DMGR_R = new Dashboard({
  name: 'Man-grouping',
  alias: 'DMGRR',
  parent: P_GRP_GROUPING_R,
  description: 'Reusable. Filtering. 3 packages',
}, { kindPrefix: true })

export const P_DSH_DMGR1_N = new Dashboard({
  name: 'Man-grouping-1',
  alias: 'DMGRN1',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. CRUD. 2 packages',
}, { kindPrefix: true })

export const P_DSH_DMGR2_N = new Dashboard({
  name: 'Man-grouping-2',
  alias: 'DMGRN2',
  parent: P_GRP_GROUPING_N,
  description: 'Non-reusable. Propagation; Activity history. 2 packages',
}, { kindPrefix: true })
