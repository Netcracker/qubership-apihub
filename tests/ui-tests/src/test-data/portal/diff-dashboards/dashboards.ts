import { Dashboard } from '@test-data/props'
import { P_GRP_DIFF_DSH_11_R, P_GRP_DIFF_DSH_13_R, P_GRP_DIFF_DSH_22_R } from './groups'

export const P_DSH_DIFF_111_R = new Dashboard({
  name: 'Diff-111',
  alias: 'DDD111R',
  parent: P_GRP_DIFF_DSH_11_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_222_R = new Dashboard({
  name: 'Diff-222',
  alias: 'DDD222R',
  parent: P_GRP_DIFF_DSH_13_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_333_R = new Dashboard({
  name: 'Diff-333',
  alias: 'DDD333R',
  parent: P_GRP_DIFF_DSH_13_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })

export const P_DSH_DIFF_444_R = new Dashboard({
  name: 'Diff-444',
  alias: 'DDD444R',
  parent: P_GRP_DIFF_DSH_22_R,
  description: 'Reusable. Different Dashboards comparison.',
}, { kindPrefix: true })
