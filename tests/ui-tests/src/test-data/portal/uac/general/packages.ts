import { Package } from '@test-data/props'
import { GRP_P_UAC_G2_N, GRP_P_UAC_GENERAL_N } from './groups'
import { TOKEN_GEN_DEFAULT, TOKEN_GEN_DEL } from './tokens'

export const PKG_P_UAC_G_INHER_N = new Package({
  name: 'UAC-Gen-Inheritance',
  alias: 'PGENIN',
  parent: GRP_P_UAC_G2_N,
}, { kindPrefix: true })

export const PKG_P_UAC_G_ASSIGN_N = new Package({
  name: 'UAC-Assignee',
  alias: 'PGENAS',
  parent: GRP_P_UAC_GENERAL_N,
}, { kindPrefix: true })

export const PKG_P_UAC_G_MULT1_N = new Package({
  name: 'UAC-Gen-Multiple1',
  alias: 'PGENM1',
  parent: GRP_P_UAC_GENERAL_N,
}, { kindPrefix: true })

export const PKG_P_UAC_G_MULT2_N = new Package({
  name: 'UAC-Gen-Multiple2',
  alias: 'PGENM2',
  parent: GRP_P_UAC_GENERAL_N,
}, { kindPrefix: true })

export const PKG_P_UAC_G_MULT3_N = new Package({
  name: 'UAC-Gen-Multiple3',
  alias: 'PGENM3',
  parent: GRP_P_UAC_GENERAL_N,
}, { kindPrefix: true })

export const PKG_P_UAC_G_TOKENS_N = new Package({
  name: 'UAC-Tokens',
  alias: 'PGENTOK',
  parent: GRP_P_UAC_GENERAL_N,
  apiKeys: [TOKEN_GEN_DEFAULT, TOKEN_GEN_DEL],
  description: 'Package for Tokens and Search scopes',
}, { kindPrefix: true })
