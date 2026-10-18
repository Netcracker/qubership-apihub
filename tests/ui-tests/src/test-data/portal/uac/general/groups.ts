import { Group } from '@test-data/props'
import { IMM_GR, VAR_GR } from '../../groups'
import { WSP_P_UAC_GENERAL_N } from './workspaces'

export const GRP_P_UAC_R = new Group({
  name: 'UAC',
  alias: 'GUACR',
  parent: IMM_GR,
})

export const GRP_P_UAC_N = new Group({
  name: 'UAC',
  alias: 'GUACN',
  parent: VAR_GR,
})

export const GRP_P_UAC_GENERAL_N = new Group({
  name: 'General',
  alias: 'GGENN',
  parent: GRP_P_UAC_N,
})

export const GRP_P_UAC_G1_N = new Group({
  name: 'UAC lvl 1',
  alias: 'GGEN1',
  parent: WSP_P_UAC_GENERAL_N,
})

export const GRP_P_UAC_G2_N = new Group({
  name: 'UAC lvl 2',
  alias: 'GGEN2',
  parent: GRP_P_UAC_G1_N,
})
