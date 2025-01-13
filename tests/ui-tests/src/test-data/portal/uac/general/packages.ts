/**
 * Copyright 2024-2025 NetCracker Technology Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
