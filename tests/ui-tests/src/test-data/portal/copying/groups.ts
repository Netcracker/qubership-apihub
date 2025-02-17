import { Group } from '@test-data/props'
import { IMM_GR, VAR_GR } from '../groups'

export const P_GR_COPYING_IMM = new Group({
  name: 'Copying Version',
  alias: 'GCPIMM',
  parent: IMM_GR,
  description: 'Reusable group for copying versions scope',
})
export const P_GR_COPYING_VAR = new Group({
  name: 'Copying Version',
  alias: 'GCPVAR',
  parent: VAR_GR,
  description: 'Non-reusable group for copying versions scope',
})
