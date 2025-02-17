import { Group } from '@test-data/props'
import { IMM_GR, VAR_GR } from '../groups'

export const P_GRP_GROUPING_R = new Group({
  name: 'Grouping',
  alias: 'GGR',
  parent: IMM_GR,
  description: 'Reusable group for grouping scope.',
})

export const P_GRP_GROUPING_N = new Group({
  name: 'Grouping',
  alias: 'GGN',
  parent: VAR_GR,
  description: 'Non-reusable group for grouping scope.',
})
